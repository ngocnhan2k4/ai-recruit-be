"""
HTTP and web scraping utilities for the job crawler.

This module contains functions for making HTTP requests, handling
rate limiting, and managing scraping sessions with anti-detection features.
"""

import random
import time
from typing import Any, Callable, Dict, List, Optional

import cloudscraper


# User agents for rotation to avoid detection
USER_AGENTS: List[str] = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.126 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0",
]


def get_headers(referer: Optional[str] = None) -> Dict[str, str]:
    """
    Generate HTTP headers for requests.
    
    Uses a random user agent to avoid detection and includes
    standard browser headers.
    
    Args:
        referer: Optional referer URL to include
        
    Returns:
        Dictionary of HTTP headers
    """
    headers = {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
    }
    
    if referer:
        headers["Referer"] = referer
        
    return headers


def human_delay(base: float = 3, jitter: float = 3) -> None:
    """
    Pause execution for a random duration to mimic human behavior.
    
    The actual delay is base + random(0, jitter) seconds.
    
    Args:
        base: Minimum delay in seconds
        jitter: Maximum additional random delay in seconds
    """
    time.sleep(base + random.uniform(0, jitter))


def fetch_page(
    scraper,
    url: str,
    headers: Optional[Dict[str, str]] = None,
    max_retries: int = 5,
    delay: float = 3
) -> Optional[str]:
    """
    Fetch a page with retry logic and challenge detection.
    
    Handles Cloudflare and similar challenges by retrying with delays.
    
    Args:
        scraper: cloudscraper instance
        url: URL to fetch
        headers: Optional headers to include
        max_retries: Maximum number of retry attempts
        delay: Base delay between retries in seconds
        
    Returns:
        Page HTML content if successful, None otherwise
    """
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


def create_scraper() -> cloudscraper.CloudScraper:
    """
    Create a cloudscraper instance configured for job crawling.
    
    Returns:
        Configured cloudscraper instance
    """
    return cloudscraper.create_scraper(
        browser={"browser": "chrome", "platform": "windows", "mobile": False}
    )


def crawl(
    scrape_page: Callable[..., Any],
    delay: float = 3,
    jitter: float = 5,
    pages: int = 1,
    start_page: int = 1
) -> Dict[str, Any]:
    """
    Generic page crawler with pagination support.
    
    Iterates through pages, calling the scrape_page function for each,
    with automatic retry on failures and human-like delays between requests.
    
    Args:
        scrape_page: Function to scrape a single page.
                     Signature: (scraper, page_num, headers) -> dict
        delay: Base delay between pages in seconds
        jitter: Maximum additional random delay in seconds
        pages: Number of pages to crawl
        start_page: Starting page number
        
    Returns:
        Dictionary mapping company names to their data including jobs
        
    Example:
        >>> def my_scraper(scraper, page_num, headers):
        ...     # Scrape logic here
        ...     return {"Company A": {"jobs": {...}}}
        >>> results = crawl(my_scraper, pages=5)
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

        # Merge companies from this page
        for name, data in page_companies.items():
            if name not in all_companies:
                all_companies[name] = data
            else:
                # Merge jobs from same company
                all_companies[name]["jobs"].update(data.get("jobs", {}))

        human_delay(delay, jitter)

    return all_companies


def generate_realistic_headers(referer: Optional[str] = None) -> Dict[str, str]:
    """
    Generate more realistic HTTP headers that better mimic browser behavior.
    
    Includes additional headers like Sec-Fetch-* for better anti-detection.
    
    Args:
        referer: Optional referer URL
        
    Returns:
        Dictionary of realistic HTTP headers
    """
    languages = [
        "en-US,en;q=0.9,vi;q=0.8",
        "en-US,en;q=0.9",
        "vi-VN,vi;q=0.9,en;q=0.8",
        "en-GB,en;q=0.9",
    ]

    headers = {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": random.choice(languages),
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Cache-Control": "max-age=0",
    }

    # Randomly include DNT header (Do Not Track)
    if random.random() > 0.3:
        headers["DNT"] = "1"

    # Add referer if provided
    if referer:
        headers["Referer"] = referer
        headers["Sec-Fetch-Site"] = "same-origin"

    return headers


def create_browser_config(randomize: bool = True) -> Dict[str, Any]:
    """
    Create browser configuration for cloudscraper.
    
    Args:
        randomize: Whether to randomly select browser configuration
        
    Returns:
        Browser configuration dictionary for cloudscraper
    """
    if randomize:
        browsers = [
            {"browser": "chrome", "platform": "windows", "mobile": False},
            {"browser": "chrome", "platform": "darwin", "mobile": False},
            {"browser": "firefox", "platform": "windows", "mobile": False},
            {"browser": "firefox", "platform": "darwin", "mobile": False},
        ]
        return random.choice(browsers)
    else:
        return {"browser": "chrome", "platform": "windows", "mobile": False}
