import csv
import asyncio
import re
import argparse
import aiosqlite
import datetime
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

async def get_or_create_scan(db_path):
    """Creates a new scan record in the database and returns the scan_id."""
    async with aiosqlite.connect(db_path) as db:
        await db.execute("PRAGMA journal_mode=WAL")
        await db.execute('''
            CREATE TABLE IF NOT EXISTS scans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scan_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                total_extracted INTEGER DEFAULT 0,
                status TEXT DEFAULT 'completed'
            )
        ''')
        await db.execute('''
            CREATE TABLE IF NOT EXISTS domains (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                domain_name TEXT NOT NULL,
                price TEXT,
                length INTEGER,
                scan_id INTEGER,
                FOREIGN KEY(scan_id) REFERENCES scans(id),
                UNIQUE(domain_name, scan_id)
            )
        ''')
        await db.commit()
        
        cursor = await db.execute(
            "INSERT INTO scans (total_extracted, status) VALUES (?, ?)", 
            (0, 'scraping')
        )
        await db.commit()
        return cursor.lastrowid

async def save_to_sqlite(db_path, scan_id, data):
    """Saves the extracted domains directly into SQLite."""
    # data format: [(domain_name, price), ...]
    # we need [(domain_name, price, price_numeric, length, scan_id)]
    formatted_data = []
    for domain, price in data:
        name_parts = domain.split('.')
        name_length = len(name_parts[0]) if name_parts else len(domain)
        
        # Parse price to a float e.g. "$4,995" -> 4995.0
        try:
            price_clean = re.sub(r'[^\d.]', '', price)
            price_numeric = float(price_clean) if price_clean else 0.0
        except:
            price_numeric = 0.0

        formatted_data.append((domain, price, price_numeric, name_length, scan_id))

    async with aiosqlite.connect(db_path, timeout=30.0) as db:
        await db.execute("PRAGMA journal_mode=WAL")
        await db.execute("PRAGMA synchronous=NORMAL")
        await db.executemany(
            "INSERT OR IGNORE INTO domains (domain_name, price, price_numeric, length, scan_id) VALUES (?, ?, ?, ?, ?)",
            formatted_data
        )
        await db.commit()


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

async def fetch_stream(length, sort_direction, db_path, scan_id):
    """Sequentially fetches all pages for a specific direction and length."""
    start_index = 1
    next_token = ""
    total_extracted = 0
    
    while True:
        params = {
            "maxrows": RECORDS_PER_PAGE,
            "start": start_index,
            "anchor": "all",
            "length_start": length,
            "length_end": length,
            "highlightbg": 1,
            "catsearch": 0,
            "sort": sort_direction
        }
        
        if next_token:
            params["n"] = next_token

        success = False
        max_retries = 20
        for attempt in range(max_retries):
            try:
                # Create a fresh session for EVERY request to force proxy rotation!
                async with AsyncSession(impersonate="chrome120", proxies=PROXIES, headers=HEADERS, timeout=45) as session:
                    response = await session.get(BASE_URL, params=params)
                    
                    if response.status_code == 200:
                        domains, next_token = parse_html_and_next(response.text)
                        
                        if domains:
                            new_domains = []
                            overlap_count = 0
                            for domain, price in domains:
                                if domain in GLOBAL_SEEN:
                                    overlap_count += 1
                                else:
                                    new_domains.append((domain, price))
                                    GLOBAL_SEEN.add(domain)
                            
                            if new_domains:
                                await save_to_sqlite(db_path, scan_id, new_domains)
                                total_extracted += len(new_domains)
                                print(f"[+] L={length} | '{sort_direction}' | start={start_index:<6} | New: {len(new_domains):<3} | Overlap: {overlap_count:<3} | NextToken: {bool(next_token):<1} | Total DB: {len(GLOBAL_SEEN)}")
                            else:
                                print(f"[*] L={length} | '{sort_direction}' | start={start_index:<6} | All {len(domains)} domains overlapped. Total DB: {len(GLOBAL_SEEN)}")
                                
                            # If a page contains a huge overlap, they've met in the middle. Safely stop this stream.
                            if overlap_count > RECORDS_PER_PAGE * 0.8:
                                print(f"[*] L={length} | '{sort_direction}' hit massive overlap (>80%). Stopping stream to save requests.")
                                return # Exit this stream completely
                            
                            # Increment start index mirroring HugeDomains parameters
                            if start_index == 1:
                                start_index = RECORDS_PER_PAGE
                            else:
                                start_index += RECORDS_PER_PAGE
                        else:
                            print(f"[*] L={length} | '{sort_direction}' No domains found. Reached the end.")
                            next_token = None
                            
                        success = True
                        break
                    elif response.status_code == 302:
                        print(f"[-] L={length} | '{sort_direction}' Hit 302 redirect. Token expired or end reached.")
                        return # Exit stream
                    elif response.status_code in [403, 429]:
                        print(f"[!] Warning: L={length} | '{sort_direction}' start={start_index} returned {response.status_code} (Proxy Block). Retrying ({attempt+1}/{max_retries})...")
                    else:
                        print(f"[!] Warning: L={length} | '{sort_direction}' start={start_index} returned {response.status_code}. Retrying ({attempt+1}/{max_retries})...")
            except Exception as e:
                print(f"[!] L={length} | '{sort_direction}' Error starting at {start_index} (Attempt {attempt+1}/{max_retries}): {e}")
                
            await asyncio.sleep(3)
            
        if not success or not next_token:
            print(f"[-] L={length} | '{sort_direction}' Stream stopping (no token or max retries hit).")
            break

MAX_CONCURRENT_LENGTHS = 10 # 10 lengths * 4 channels = 40 parallel streams

async def process_length(length, channels, semaphore, db_path, scan_id):
    async with semaphore:
        print(f"\n[*] Starting extraction for Domain Length: {length}")
        tasks = [fetch_stream(length, sort_dir, db_path, scan_id) for sort_dir in channels]
        await asyncio.gather(*tasks)
        print(f"\n[*] Finished Length {length}. Total unique so far: {len(GLOBAL_SEEN)}")

async def main():
    parser = argparse.ArgumentParser(description="HugeDomains Scraper -> SQLite")
    parser.add_argument("--db-path", default="hugedomains.db", help="Path to the SQLite database")
    args = parser.parse_args()

    print("=== HugeDomains Fast Asynchronous Scraper (Multi-Length, 4-Channel) ===")
    print(f"[*] Proxy Configured: {PROXY_URL}")
    print(f"[*] Database Path: {args.db_path}")
    print(f"[*] Concurrency: {MAX_CONCURRENT_LENGTHS} lengths at a time (total {MAX_CONCURRENT_LENGTHS * 4} streams)")
    
    # Initialize DB and get scan ID
    scan_id = await get_or_create_scan(args.db_path)
    print(f"[*] Starting Scan ID: {scan_id}")
    
    channels = ["PriceAsc", "PriceDesc", "NameAsc", "NameDesc"]
    semaphore = asyncio.Semaphore(MAX_CONCURRENT_LENGTHS)
    
    tasks = [process_length(length, channels, semaphore, args.db_path, scan_id) for length in range(1, 64)]
    
    # Process all lengths concurrently within the semaphore limit
    await asyncio.gather(*tasks)
        
    # Update scan status to complete
    async with aiosqlite.connect(args.db_path) as db:
        await db.execute(
            "UPDATE scans SET total_extracted = ?, status = 'completed' WHERE id = ?",
            (len(GLOBAL_SEEN), scan_id)
        )
        await db.commit()

    print(f"\n=== Scraping Complete. Grand Total unique domains extracted: {len(GLOBAL_SEEN)} ===")

if __name__ == "__main__":
    import platform
    if platform.system() == "Windows":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
