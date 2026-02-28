import csv
import asyncio
from bs4 import BeautifulSoup
from curl_cffi.requests import AsyncSession

# Configuration
BASE_URL = "https://www.hugedomains.com/domain_search.cfm"
HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
}

PROXY_URL = "http://6c2eed6ba44a2b9d2ec4__cr.ca:942b397babcb4154@gw.dataimpulse.com:823"
PROXIES = {
    "http": PROXY_URL,
    "https": PROXY_URL,
}

RECORDS_PER_PAGE = 500
CONCURRENT_REQUESTS = 30  # Number of pages to fetch simultaneously in a batch


def parse_html(html_content):
    """Extracts domains and prices from HTML content."""
    soup = BeautifulSoup(html_content, "html.parser")
    domain_rows = soup.find_all("div", class_="domain-row")
    
    extracted_data = []
    
    for row in domain_rows:
        domain_link = row.select_one("span.domain > a.link")
        price_span = row.select_one("span.domain > span.price")
        
        if domain_link and price_span:
            domain_name = domain_link.text.strip()
            price = price_span.text.strip()
            extracted_data.append((domain_name, price))
            
    return extracted_data


import re

def save_to_csv(data, filename="domains_async.csv", append=False):
    """Saves the extracted data to a CSV file."""
    mode = 'a' if append else 'w'
    with open(filename, mode=mode, newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        if not append:
            writer.writerow(["Domain", "Price"])
        writer.writerows(data)

def parse_html_and_next(html_content):
    """Extracts domains, prices, and the next 'n' cursor from HTML content."""
    soup = BeautifulSoup(html_content, "html.parser")
    domain_rows = soup.find_all("div", class_="domain-row")
    
    extracted_data = []
    
    for row in domain_rows:
        domain_link = row.select_one("span.domain > a.link")
        price_span = row.select_one("span.domain > span.price")
        
        if domain_link and price_span:
            domain_name = domain_link.text.strip()
            price = price_span.text.strip()
            extracted_data.append((domain_name, price))
            
    # Extract the 'n' cursor token for the next page explicitly matching the Next button
    next_token = None
    next_link = soup.select_one("a.next-link, a.next-serch-link")
    if next_link and next_link.has_attr('href'):
        match = re.search(r'n=([^&"]+)', next_link['href'])
        if match:
            next_token = match.group(1)
            
    return extracted_data, next_token

GLOBAL_SEEN = set()
OVERLAP_DETECTED = asyncio.Event()

async def fetch_stream(sort_direction):
    """Sequentially fetches all pages for a specific direction following the 'n' token."""
    start_index = 1
    next_token = ""
    total_extracted = 0
    
    # Maintain a single persistent connection session for speed
    async with AsyncSession(impersonate="chrome120", proxies=PROXIES, headers=HEADERS, timeout=45) as session:
        while not OVERLAP_DETECTED.is_set():
            # Exact parameters requested
            params = {
                "maxrows": RECORDS_PER_PAGE,
                "start": start_index,
                "anchor": "all",
                "highlightbg": 0,
                "catsearch": 0,
                "sort": sort_direction
            }
            
            if next_token:
                params["n"] = next_token

            success = False
            for attempt in range(3):
                if OVERLAP_DETECTED.is_set():
                    break
                try:
                    response = await session.get(BASE_URL, params=params)
                    
                    if response.status_code == 200:
                        domains, next_token = parse_html_and_next(response.text)
                        
                        if domains:
                            new_domains = []
                            overlap_count = 0
                            overlap_examples = []
                            for domain, price in domains:
                                if domain in GLOBAL_SEEN:
                                    overlap_count += 1
                                    if len(overlap_examples) < 3:
                                        overlap_examples.append(domain)
                                else:
                                    new_domains.append((domain, price))
                                    GLOBAL_SEEN.add(domain)
                            
                            if new_domains:
                                save_to_csv(new_domains, append=True)
                                total_extracted += len(new_domains)
                                print(f"[+] '{sort_direction}' | start={start_index} | Extracted {len(new_domains)} | Overlaps: {overlap_count} | Total DB: {len(GLOBAL_SEEN)}")
                                if overlap_examples:
                                    print(f"    Overlaps include: {', '.join(overlap_examples)}")
                            
                            # If a page contains a huge overlap, they've met in the middle.
                            if overlap_count > RECORDS_PER_PAGE // 2:
                                print(f"[*] '{sort_direction}' met the other crawler! Stopping. Examples: {', '.join(overlap_examples)}")
                                OVERLAP_DETECTED.set()
                                break
                            
                            # Increment start mimicking HugeDomains pattern
                            if start_index == 1:
                                start_index = RECORDS_PER_PAGE
                            else:
                                start_index += RECORDS_PER_PAGE
                        else:
                            print(f"[*] '{sort_direction}' No domains found. Reached the end.")
                            OVERLAP_DETECTED.set()
                            next_token = None
                            
                        success = True
                        break
                    elif response.status_code == 302:
                        print(f"[-] Hit 302 redirect. Token expired or end reached.")
                        OVERLAP_DETECTED.set()
                        break
                    else:
                        print(f"[!] Warning: '{sort_direction}' start={start_index} returned {response.status_code}. Retrying...")
                except Exception as e:
                    print(f"[!] '{sort_direction}' Error starting at {start_index} (Attempt {attempt+1}): {e}")
                    
                await asyncio.sleep(2)
                
            if not success or not next_token or OVERLAP_DETECTED.is_set():
                break

async def main():
    print("=== HugeDomains Fast Asynchronous Scraper (Dual Channel) ===")
    print(f"[*] Proxy Configured: {PROXY_URL}")
    print("[*] Starting dual-channel crawler: PriceDesc and PriceAsc...")
    
    save_to_csv([], filename="domains_async.csv", append=False)
    
    tasks = [
        fetch_stream("priceDesc"),
        fetch_stream("priceAsc")
    ]
    
    await asyncio.gather(*tasks)
    
    print(f"\n=== Scraping Complete. Total unique domains extracted: {len(GLOBAL_SEEN)} ===")

if __name__ == "__main__":
    import platform
    if platform.system() == "Windows":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
