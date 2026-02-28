import asyncio
import re
import csv
import os
from datetime import datetime
from typing import Optional, List, Tuple
from bs4 import BeautifulSoup
from curl_cffi.requests import AsyncSession
from database import get_db

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
PROXIES = {"http": PROXY_URL, "https": PROXY_URL}

RECORDS_PER_PAGE = 500
MAX_CONCURRENT_LENGTHS = 10

class ScraperState:
    def __init__(self):
        self.is_running: bool = False
        self.status: str = "idle"
        self.total_extracted: int = 0
        self.scan_id: Optional[int] = None
        self.start_time: Optional[datetime] = None
        self.snapshot_name: str = ""

scraper_state = ScraperState()

def parse_html_and_next(html_content):
    soup = BeautifulSoup(html_content, "html.parser")
    domain_rows = soup.find_all("div", class_="domain-row")
    
    extracted_data = []
    for row in domain_rows:
        domain_link = row.select_one("span.domain > a.link")
        price_span = row.select_one("span.domain > span.price")
        
        if domain_link and price_span:
            domain_name = domain_link.text.strip().lower() # Normalize immediately
            price_text = price_span.text.strip()
            # Clean price
            try:
                price_clean = re.sub(r'[^\d.]', '', price_text)
                price_numeric = float(price_clean) if price_clean else None
            except:
                price_numeric = None

            name_parts = domain_name.split('.')
            name_length = len(name_parts[0]) if name_parts else len(domain_name)

            extracted_data.append((domain_name, price_numeric, name_length))
            
    next_token = None
    next_link = soup.select_one("a.next-link, a.next-serch-link")
    if next_link and next_link.has_attr('href'):
        match = re.search(r'n=([^&"]+)', next_link['href'])
        if match:
            next_token = match.group(1)
            
    return extracted_data, next_token

def save_to_csv(data: list, filename: str, append: bool = False):
    """Saves the extracted data to a CSV file."""
    mode = 'a' if append else 'w'
    with open(filename, mode=mode, newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        if not append:
            writer.writerow(["domain_name", "price_numeric", "length_numeric"])
        if data:
            writer.writerows(data)

async def fetch_stream(length, sort_direction, global_seen, snapshot_id):
    start_index = 1
    next_token = ""
    
    while scraper_state.is_running:
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
        max_retries = 10
        for attempt in range(max_retries):
            if not scraper_state.is_running:
                break
            try:
                # Use curl_cffi to bypass protection
                async with AsyncSession(impersonate="chrome120", proxies=PROXIES, headers=HEADERS, timeout=45) as session:
                    response = await session.get(BASE_URL, params=params)
                    
                    if response.status_code == 200:
                        domains, next_token = parse_html_and_next(response.text)
                        
                        if domains:
                            new_domains: list[tuple[str, Optional[float], int]] = []
                            overlap_count: int = 0
                            for item in domains:
                                domain_name = item[0]
                                if domain_name in global_seen:
                                    overlap_count += 1
                                else:
                                    new_domains.append(item)
                                    global_seen.add(domain_name)
                            
                            if new_domains:
                                save_to_csv(new_domains, filename=f"/tmp/snapshot_{snapshot_id}.csv", append=True)
                                scraper_state.total_extracted += len(new_domains)
                            
                            overlap_count = int(overlap_count)
                            if overlap_count > RECORDS_PER_PAGE * 0.8:
                                # They met in the middle. Stop this stream safely.
                                return
                            
                            if start_index == 1:
                                start_index = RECORDS_PER_PAGE
                            else:
                                start_index += RECORDS_PER_PAGE
                        else:
                            next_token = None
                            
                        success = True
                        break
                    elif response.status_code == 302:
                        return # Token expired or end
                    else:
                        pass # Blocked, retry
            except Exception as e:
                pass
            await asyncio.sleep(2)
            
        if not success or not next_token:
            break

async def process_length(length, channels, semaphore, global_seen, snapshot_id):
    async with semaphore:
        if not scraper_state.is_running:
            return
        tasks = [fetch_stream(length, sort_dir, global_seen, snapshot_id) for sort_dir in channels]
        await asyncio.gather(*tasks)

async def run_scraper_engine(snapshot_name: str):
    scraper_state.is_running = True
    scraper_state.status = "scraping"
    scraper_state.snapshot_name = snapshot_name
    scraper_state.total_extracted = 0
    scraper_state.start_time = datetime.now()
    
    # Create the snapshot entry
    def create_snapshot() -> int:
        with get_db() as cursor:
            cursor.execute("INSERT INTO snapshots (name) VALUES (?)", [snapshot_name])
            return cursor.execute("SELECT currval('snapshot_seq')").fetchone()[0]
    
    snapshot_id = await asyncio.get_event_loop().run_in_executor(None, create_snapshot)
    scraper_state.scan_id = snapshot_id
    
    # Initialize CSV file
    csv_file = f"/tmp/snapshot_{snapshot_id}.csv"
    save_to_csv([], filename=csv_file, append=False)
    
    global_seen = set()
    channels = ["PriceAsc", "PriceDesc", "NameAsc", "NameDesc"]
    semaphore = asyncio.Semaphore(MAX_CONCURRENT_LENGTHS)
    
    tasks = [process_length(length, channels, semaphore, global_seen, snapshot_id) for length in range(1, 64)]
    
    try:
        await asyncio.gather(*tasks)
    finally:
        scraper_state.is_running = False
        scraper_state.status = "finalizing_db"
        
        def finalize_scrape():
            try:
                with get_db() as cursor:
                    cursor.execute(f"""
                        INSERT INTO domains (name, length)
                        SELECT DISTINCT domain_name, length_numeric 
                        FROM read_csv_auto('{csv_file}', header=True)
                        WHERE domain_name IS NOT NULL
                        ON CONFLICT (name) DO NOTHING;
                    """)

                    cursor.execute(f"""
                        INSERT INTO snapshot_data (snapshot_id, domain_id, domain, price_usd, length)
                        SELECT 
                            {snapshot_id},
                            d.id,
                            csv.domain_name,
                            csv.price_numeric,
                            csv.length_numeric
                        FROM read_csv_auto('{csv_file}', header=True) csv
                        JOIN domains d ON d.name = csv.domain_name;
                    """)
                    
                    cursor.execute("UPDATE snapshots SET row_count = (SELECT count(*) FROM snapshot_data WHERE snapshot_id = ?) WHERE id = ?", [snapshot_id, snapshot_id])
            except Exception as e:
                print(f"Finalization failed: {e}")
            finally:
                if os.path.exists(csv_file):
                    os.remove(csv_file)
        
        if scraper_state.total_extracted > 0:
            await asyncio.get_event_loop().run_in_executor(None, finalize_scrape)
        else:
            if os.path.exists(csv_file):
                os.remove(csv_file)

        scraper_state.status = "completed"

def stop_scraper_engine():
    scraper_state.is_running = False
    scraper_state.status = "stopped"
