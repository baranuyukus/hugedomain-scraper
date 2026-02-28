import sys
from curl_cffi import requests

def main():
    url = "https://www.hugedomains.com/domain_search.cfm?maxRows=500&start=0&domain_name=&highlightbg=0&length_start=&length_end=&price_from=&price_to=&dot=&SORT=priceDesc&catSearch=0&anchor=all"
    
    headers = {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
    }
    
    print(f"Fetching {url}...")
    try:
        response = requests.get(url, impersonate="chrome120", headers=headers, timeout=30)
        print(f"Status Code: {response.status_code}")
        
        with open("test.html", "w", encoding="utf-8") as f:
            f.write(response.text)
            
        print("Saved to test.html")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
