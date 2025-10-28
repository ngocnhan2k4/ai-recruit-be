import time
import random
from datetime import datetime, timezone, timedelta
import re
from typing import Callable, Any, Tuple, Optional
from urllib.parse import urlparse
import math
import unicodedata
import socket
import ipaddress
import socket
import ipaddress
import cloudscraper

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.126 Safari/537.36",
]

def crawl(scrape_page: Callable[..., Any], delay=3, jitter=5, pages=1):
    scraper = cloudscraper.create_scraper(
        browser={'browser': 'chrome', 'platform': 'windows', 'mobile': False}
    )

    headers = get_headers()

    all_companies = {}

    for page_num in range(1, pages + 1):
        attempts = 0
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
                    page_companies = {}
                    break
                human_delay(delay, jitter)

        for name, data in page_companies.items():
            if name not in all_companies:
                all_companies[name] = data
            else:
                all_companies[name]["jobs"].update(data["jobs"])

        human_delay(delay, jitter)

    return all_companies


def get_headers():
    return {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
    }


def human_delay(base=3, jitter=3):
    time.sleep(base + random.uniform(0, jitter))


def fetch_page(scraper, url, headers=None, max_retries=5, delay=3):
    for attempt in range(max_retries):
        resp = scraper.get(url, headers=headers)
        if resp.status_code == 200 and "Just a moment..." not in resp.text:
            return resp.text
        print(f"[!] Blocked or challenge on {url}, retrying ({attempt+1}/{max_retries})...")
        time.sleep(delay + random.uniform(0, 2))
    return None

def safe_text(el, is_strip=True, sep=""):
    if not el:
        return "N/A"
    txt = el.get_text(separator=sep, strip=is_strip)
    return txt if txt else "N/A"


def get_date_posted(loc_span):
    for idx, span in enumerate(loc_span):
        if idx < 2:
            continue
        text = safe_text(span)
        if re.search(r"\d", text) and re.search(r"\bago\b", text, re.IGNORECASE):
            return text
    return None


def vn_parse_posted_date(text: str) -> datetime:
    clean = re.sub(r"\s+", " ", text).strip().lower()

    m = re.search(r"(\d+)\s*(giây|phút|giờ|ngày)", clean)
    
    if not m:
        raise ValueError(f"Unrecognized date string: {text!r}")

    value = int(m.group(1))
    unit = m.group(2)

    now = datetime.now()

    if unit == "giây":
        return now - timedelta(seconds=value)
    if unit == "phút":
        return now - timedelta(minutes=value)
    elif unit == "giờ":
        return now - timedelta(hours=value)
    elif unit == "ngày":
        return now - timedelta(days=value)
    else:
        raise ValueError(f"Unknown unit in date string: {text!r}")


def parse_posted_date(text: str) -> datetime:
    clean = re.sub(r"\s+", " ", text).strip()

    m = re.search(r"(\d+)\s*(minute|hour|day|week|month)", clean, re.IGNORECASE)
    if not m:
        raise ValueError(f"Unrecognized date string: {text!r}")

    value = int(m.group(1))
    unit = m.group(2).lower()

    now = datetime.now()
    if unit.startswith("minute"):
        return now - timedelta(minutes=value)
    elif unit.startswith("hour"):
        return now - timedelta(hours=value)
    elif unit.startswith("day"):
        return now - timedelta(days=value)
    elif unit.startswith("week"):
        return now - timedelta(weeks=value)
    elif unit.startswith("month"):
        return now - timedelta(days=value * 30)
    else:
        raise ValueError(f"Unknown unit in date string: {text!r}")
    

def extract_employees(company_size: str):
    if "-" in company_size:
        fields = company_size.split("-")
        return int(fields[0]), int(fields[1])
    elif "+" in company_size:
        fields = company_size.split("+")
        return int(fields[0]), None
    
def extract_salary(salary: str) -> tuple[int, int]:
    s = salary.replace(",", "").lower().strip()
    USD_CONVERSION_FACTOR = 25.0

    if "thoả thuận" in s:
        return 0, 0 

    if s.startswith("tới"):
        match = re.search(r"(\d+)\s*(triệu|usd)", s)
        if match:
            value = float(match.group(1))
            unit = match.group(2)
            
            max_salary = value
            if unit == "usd":
                max_salary = value * USD_CONVERSION_FACTOR / 1000
            
            return 0, int(round(max_salary))

    if "-" in s:
        parts = s.split("-")
        
        min_match = re.search(r"(\d+)", parts[0])
        max_match = re.search(r"(\d+)\s*(triệu|usd)", parts[1])
        
        if min_match and max_match:
            min_value = float(min_match.group(1))
            max_value = float(max_match.group(1))
            unit = max_match.group(2)
            
            if unit == "triệu":
                min_salary = min_value
                max_salary = max_value
            elif unit == "usd":
                min_salary = min_value * USD_CONVERSION_FACTOR / 1000
                max_salary = max_value * USD_CONVERSION_FACTOR / 1000
            
            return int(round(min_salary)), int(round(max_salary))
        
    return 0, 0


def extract_experience_years(experience_str: str) -> int:
    s = experience_str.lower().strip()
    
    if "không yêu cầu" in s:
        return 0
    
    match = re.search(r"(\d+)\s*năm", s)
    
    if match:
        value = int(match.group(1))
        return value
        
    return 0

def extract_experience_years_jobsgo(experience_str: str):
    s = experience_str.lower().replace("năm", "").strip()
    
    if "không yêu cầu" in s:
        return 0, None
    
    if "dưới" in s:
        try:
            max_val = math.ceil(float(s.replace("dưới", "").strip()))
            return None, max_val
        except:
            return None, None
    elif "trên" in s:
        try:
            min_val = math.ceil(float(s.replace("trên", "").strip()))
            return min_val, None
        except:
            return None, None
    elif "-" in s:
        try:
            min_val, max_val = s.split("-")
            min_val = math.ceil(float(min_val.strip()))
            max_val = math.ceil(float(max_val.strip()))
            return min_val, max_val
        except:
            return None, None
    else:
        # single number
        try:
            val = math.ceil(float(s))
            return val, val
        except:
            return None, None


def process_province(locations: list[str]) -> list:
    length = len(locations)
    if length > 1:
        return [locations[1] if ("Vietnam" not in locations[1]) else locations[0]]
    elif "Vietnam" in locations[0]:
        return []
    
    return locations

def extract_employee_range(text: str) -> Tuple[Optional[int], Optional[int]]:
    if not isinstance(text, str):
        return (None, None)

    number_strings = re.findall(r'[\d,.]+', text)

    numbers = []
    for s in number_strings:
        try:
            cleaned_num = int(s.replace('.', '').replace(',', ''))
            numbers.append(cleaned_num)
        except ValueError:
            continue

    if len(numbers) >= 2:
        return (numbers[0], numbers[1])
    elif len(numbers) == 1:
        return (numbers[0], None)
    else:
        return (None, None)
    

def is_safe_db_url(url_string: str) -> bool:
    """
    Validates a URL against a blacklist of common SSRF targets.
    Returns True if the URL is considered safe, False otherwise.
    """
    # 1. Blacklist of dangerous URL schemes
    DISALLOWED_SCHEMES = ["file", "ftp", "gopher", "dict"]
    
    # 2. Blacklist of private and reserved IP networks
    BLACKLISTED_NETWORKS = [
        ipaddress.ip_network("10.0.0.0/8"),     # Private range
        ipaddress.ip_network("172.16.0.0/12"),  # Private range
        ipaddress.ip_network("192.168.0.0/16"), # Private range
        ipaddress.ip_network("169.254.0.0/16"), # Link-local
        ipaddress.ip_network("0.0.0.0/8"),      # Reserved
    ]

    try:
        parsed_url = urlparse(url_string)
        hostname = parsed_url.hostname

        if not hostname:
            print("Error: DB URL has no hostname.")
            return False
            
        if parsed_url.scheme in DISALLOWED_SCHEMES:
            print(f"Error: URL scheme '{parsed_url.scheme}' is not allowed.")
            return False

        # Resolve hostname to an IP address
        resolved_ip = ipaddress.ip_address(socket.gethostbyname(hostname))

        # Check if the resolved IP is in any blacklisted network
        for network in BLACKLISTED_NETWORKS:
            if resolved_ip in network:
                print(f"Error: DB host '{hostname}' resolves to a blacklisted IP address '{resolved_ip}'.")
                return False

    except (ValueError, socket.gaierror) as e:
        print(f"Error validating DB URL: {e}")
        return False

    # If all checks pass, the URL is considered safe
    return True

def vietnam_time_now():
    vn_tz = timezone(timedelta(hours=7))
    return datetime.now(vn_tz).strftime("%Y-%m-%d %H:%M:%S")

def slugify(text):
    # Normalize and remove accents (Vietnamese, etc.)
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")