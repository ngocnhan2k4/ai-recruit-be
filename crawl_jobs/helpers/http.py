"""
HTTP and web scraping utilities for the job crawler.
"""

import random
import time
from typing import Any, Callable, Dict, List, Optional

from curl_cffi import requests


USER_AGENTS: List[str] = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.126 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0",
]


def get_headers(referer: Optional[str] = None) -> Dict[str, str]:
    """Generate HTTP headers with a random user agent."""
    headers = {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
    }
    if referer:
        headers["Referer"] = referer
    return headers


def human_delay(base: float = 3, jitter: float = 3) -> None:
    """Pause execution for base + random(0, jitter) seconds."""
    time.sleep(base + random.uniform(0, jitter))


def fetch_page(
    scraper,
    url: str,
    headers: Optional[Dict[str, str]] = None,
    max_retries: int = 5,
    delay: float = 3,
) -> Optional[str]:
    """Fetch a page with retry logic and challenge detection."""
    for attempt in range(max_retries):
        try:
            resp = scraper.get(url, headers=headers)
            if resp.status_code == 200 and "Just a moment..." not in resp.text:
                return resp.text
            print(
                f"[!] Blocked or challenge on {url}, retrying ({attempt + 1}/{max_retries})..."
            )
        except Exception as e:
            print(f"[!] Error fetching {url}: {e}, retrying ({attempt + 1}/{max_retries})...")

        time.sleep(delay + random.uniform(0, 2))

    return None


def create_scraper():
    """Create a curl_cffi Session instance configured for job crawling."""
    return requests.Session(impersonate="chrome")


def crawl(
    scrape_page: Callable[..., Any],
    delay: float = 3,
    jitter: float = 5,
    pages: int = 1,
    start_page: int = 1,
) -> Dict[str, Any]:
    """
    Generic page crawler with pagination support.

    Iterates through pages, calling scrape_page(scraper, page_num, headers)
    for each, with retry on failures and human-like delays between requests.
    """
    scraper = create_scraper()
    headers = get_headers()

    all_companies: Dict[str, Any] = {}

    for page_num in range(start_page, start_page + pages):
        attempts = 0
        page_companies: Dict[str, Any] = {}

        while True:
            try:
                attempts += 1
                print(f"Scraping page {page_num} (attempt {attempts})")
                page_companies = scrape_page(scraper, page_num, headers)
                break
            except Exception as e:
                print(f"Error on page {page_num}: {e}")
                if attempts >= 3:
                    print(f"Skipping page {page_num} after 3 failures.")
                    break
                human_delay(delay, jitter)

        for name, data in page_companies.items():
            if name not in all_companies:
                all_companies[name] = data
            else:
                all_companies[name]["jobs"].update(data.get("jobs", {}))

        human_delay(delay, jitter)

    return all_companies