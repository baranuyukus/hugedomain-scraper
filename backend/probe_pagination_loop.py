import argparse
import hashlib
import os
import re
import time
from dataclasses import dataclass
from typing import Optional

from bs4 import BeautifulSoup
from curl_cffi import requests


BASE_URL = "https://www.hugedomains.com/domain_search.cfm"

HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
}


@dataclass
class ParsedPage:
    domains: list[str]
    next_token: Optional[str]
    title: str
    is_challenge: bool
    text_sample: str


def parse_page(html: str) -> ParsedPage:
    soup = BeautifulSoup(html, "html.parser")
    domains = [
        link.text.strip().lower()
        for link in soup.select("div.domain-row span.domain > a.link")
        if link.text.strip()
    ]

    next_token = None
    next_link = soup.select_one("a.next-link, a.next-serch-link")
    if next_link and next_link.has_attr("href"):
        match = re.search(r"n=([^&\"]+)", next_link["href"])
        if match:
            next_token = match.group(1)

    title = soup.title.text.strip() if soup.title else "-"
    text = soup.get_text(" ", strip=True)
    lower_text = text.lower()
    is_challenge = (
        "captcha security check" in lower_text
        or "prove you're not a robot" in lower_text
        or "please prove you" in lower_text
    )

    return ParsedPage(
        domains=domains,
        next_token=next_token,
        title=title,
        is_challenge=is_challenge,
        text_sample=text[:180].replace("\n", " "),
    )


def page_signature(domains: list[str]) -> str:
    return hashlib.sha1("\n".join(domains).encode("utf-8")).hexdigest()[:12]


def fetch_page(
    params: dict,
    proxy_url: Optional[str],
    timeout: int,
    impersonate: str,
    session: Optional[requests.Session] = None,
):
    proxies = {"http": proxy_url, "https": proxy_url} if proxy_url else None
    client = session or requests
    kwargs = {
        "params": params,
        "headers": HEADERS,
        "timeout": timeout,
    }
    if proxies:
        kwargs["proxies"] = proxies
    if session is None:
        kwargs["impersonate"] = impersonate
    return client.get(BASE_URL, **kwargs)


def main():
    parser = argparse.ArgumentParser(
        description="Probe HugeDomains pagination for repeats/looping pages."
    )
    parser.add_argument("--max-pages", type=int, default=250)
    parser.add_argument("--maxrows", type=int, default=500)
    parser.add_argument("--sort", default="PriceDesc")
    parser.add_argument("--anchor", default="all")
    parser.add_argument("--timeout", type=int, default=35)
    parser.add_argument("--retries", type=int, default=5)
    parser.add_argument("--sleep", type=float, default=0.25)
    parser.add_argument("--impersonate", default="chrome120")
    parser.add_argument("--proxy", default=os.getenv("HD_PROXY", ""))
    parser.add_argument(
        "--persistent-session",
        action="store_true",
        help="Reuse one curl_cffi session across pages instead of opening a fresh request.",
    )
    args = parser.parse_args()

    proxy_url = args.proxy or None
    seen_domains: set[str] = set()
    seen_signatures: dict[str, int] = {}
    next_token = ""
    start_index = 1

    print(
        "Probe: general search, no prefix, "
        f"anchor={args.anchor}, sort={args.sort}, maxrows={args.maxrows}, "
        f"max_pages={args.max_pages}, proxy={'yes' if proxy_url else 'no'}, "
        f"impersonate={args.impersonate}, persistent_session={args.persistent_session}",
        flush=True,
    )
    print(
        "page,start,http,rows,new,overlap,overlap_pct,repeat_of,"
        "first,last,next,attempt,bytes,title",
        flush=True,
    )

    session = None
    if args.persistent_session:
        proxies = {"http": proxy_url, "https": proxy_url} if proxy_url else None
        session = requests.Session(
            impersonate=args.impersonate,
            headers=HEADERS,
            proxies=proxies,
        )

    try:
        for page in range(1, args.max_pages + 1):
            params = {
                "maxrows": args.maxrows,
                "start": start_index,
                "domain_name": "",
                "highlightbg": 0,
                "length_start": "",
                "length_end": "",
                "price_from": "",
                "price_to": "",
                "dot": "",
                "catsearch": 0,
                "anchor": args.anchor,
                "sort": args.sort,
            }
            if next_token:
                params["n"] = next_token

            response = None
            parsed = None
            for attempt in range(1, args.retries + 1):
                try:
                    response = fetch_page(
                        params=params,
                        proxy_url=proxy_url,
                        timeout=args.timeout,
                        impersonate=args.impersonate,
                        session=session,
                    )
                    parsed = parse_page(response.text)
                    if (
                        response.status_code == 200
                        and parsed.domains
                        and parsed.next_token
                        and not parsed.is_challenge
                    ):
                        break
                    reason = "challenge" if parsed.is_challenge else "empty_or_no_next"
                    print(
                        f"retry page={page} start={start_index} attempt={attempt} "
                        f"http={response.status_code} rows={len(parsed.domains)} reason={reason} "
                        f"title={parsed.title!r}",
                        flush=True,
                    )
                except Exception as exc:
                    print(
                        f"retry page={page} start={start_index} attempt={attempt} "
                        f"error={type(exc).__name__}: {exc}",
                        flush=True,
                    )
                time.sleep(max(1.0, args.sleep) * attempt)

            if response is None or parsed is None:
                print(f"STOP no usable response page={page} start={start_index}", flush=True)
                break

            sig = page_signature(parsed.domains)
            repeat_of = seen_signatures.get(sig)
            overlap = sum(1 for domain in parsed.domains if domain in seen_domains)
            new_count = len(parsed.domains) - overlap
            overlap_pct = (
                round((overlap / len(parsed.domains) * 100), 1) if parsed.domains else 0
            )
            first = parsed.domains[0] if parsed.domains else "-"
            last = parsed.domains[-1] if parsed.domains else "-"

            print(
                f"{page},{start_index},{response.status_code},{len(parsed.domains)},"
                f"{new_count},{overlap},{overlap_pct},{repeat_of or ''},"
                f"{first},{last},{bool(parsed.next_token)},{attempt},"
                f"{len(response.text)},{parsed.title}",
                flush=True,
            )

            if repeat_of:
                print(
                    f"LOOP_DETECTED page={page} repeats exact domain list from page={repeat_of}",
                    flush=True,
                )
                break

            if parsed.domains and overlap_pct >= 80:
                print(
                    f"HIGH_OVERLAP_DETECTED page={page} overlap_pct={overlap_pct} "
                    f"new={new_count}",
                    flush=True,
                )
                break

            if (
                response.status_code != 200
                or not parsed.domains
                or not parsed.next_token
                or parsed.is_challenge
            ):
                print(
                    f"STOP abnormal page={page} title={parsed.title!r} "
                    f"sample={parsed.text_sample!r}",
                    flush=True,
                )
                break

            seen_signatures[sig] = page
            seen_domains.update(parsed.domains)
            next_token = parsed.next_token or ""
            start_index = args.maxrows if start_index == 1 else start_index + args.maxrows
            time.sleep(args.sleep)
        else:
            print(f"NO_LOOP_WITHIN_{args.max_pages}_PAGES", flush=True)
    finally:
        if session is not None:
            session.close()

    print(
        f"FINAL unique_observed={len(seen_domains)} pages_completed={page}",
        flush=True,
    )


if __name__ == "__main__":
    main()
