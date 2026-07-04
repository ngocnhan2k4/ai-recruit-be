import random
import re
import time
from datetime import datetime, timedelta, timezone
from urllib.parse import urljoin

from curl_cffi import requests
from bs4 import BeautifulSoup
from helpers.date import vn_parse_posted_date
from helpers.extraction import (
    extract_employees,
    extract_experience_years,
    extract_salary,
)
from helpers.http import human_delay
from helpers.province import is_likely_province
from helpers.text import html_to_mixed_content, safe_text

# More diverse and updated user agents
TOPCV_USER_AGENTS = [
    # Chrome on Windows (most common)
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    # Chrome on Mac
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    # Firefox
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
    # Edge
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
    # Safari
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
]


def create_stealth_scraper():
    """Create a curl_cffi Session instance configured for job crawling."""
    return requests.Session(impersonate="chrome")


def get_stealth_headers(referer=None, host="www.topcv.vn"):
    """Generate highly realistic browser headers."""
    ua = random.choice(TOPCV_USER_AGENTS)

    # Determine browser type from UA
    is_firefox = "Firefox" in ua
    is_chrome = "Chrome" in ua and "Edg" not in ua
    is_edge = "Edg" in ua

    headers = {
        "Host": host,
        "User-Agent": ua,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": random.choice(
            [
                "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
                "en-US,en;q=0.9,vi;q=0.8",
                "vi,en-US;q=0.9,en;q=0.8",
            ]
        ),
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Cache-Control": "max-age=0",
    }

    # Add browser-specific security headers
    if is_chrome or is_edge:
        headers.update(
            {
                "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                "Sec-Ch-Ua-Mobile": "?0",
                "Sec-Ch-Ua-Platform": '"Windows"',
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "none" if not referer else "same-origin",
                "Sec-Fetch-User": "?1",
            }
        )
    elif is_firefox:
        headers.update(
            {
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "none" if not referer else "same-origin",
                "Sec-Fetch-User": "?1",
            }
        )

    # Random DNT
    if random.random() > 0.5:
        headers["DNT"] = "1"

    if referer:
        headers["Referer"] = referer

    return headers


def fetch_with_retry(scraper, url, headers=None, max_retries=5, base_delay=5):
    """Fetch page with exponential backoff and better error handling."""

    for attempt in range(max_retries):
        try:
            # Calculate exponential backoff delay
            if attempt > 0:
                backoff_delay = base_delay * (2 ** (attempt - 1)) + random.uniform(1, 3)
                print(f"    Waiting {backoff_delay:.1f}s before retry...")
                time.sleep(backoff_delay)

            # Make request
            resp = scraper.get(url, headers=headers, timeout=30)

            # Check for various blocking indicators
            if resp.status_code == 403:
                print(
                    f"[!] 403 Forbidden on {url}, retrying ({attempt + 1}/{max_retries})..."
                )
                continue

            if resp.status_code == 429:
                print(
                    f"[!] Rate limited (429) on {url}, retrying ({attempt + 1}/{max_retries})..."
                )
                continue

            if resp.status_code != 200:
                print(
                    f"[!] HTTP {resp.status_code} on {url}, retrying ({attempt + 1}/{max_retries})..."
                )
                continue

            # Check for Cloudflare challenge
            if "Just a moment..." in resp.text:
                print(
                    f"[!] Cloudflare challenge on {url}, retrying ({attempt + 1}/{max_retries})..."
                )
                continue

            if "Attention Required" in resp.text:
                print(
                    f"[!] Cloudflare attention on {url}, retrying ({attempt + 1}/{max_retries})..."
                )
                continue

            # Check for Cloudflare challenge
            if "cf-challenge" in resp.text or "ray id:" in resp.text.lower():
                print(
                    f"[!] Cloudflare challenge detected on {url}, retrying ({attempt + 1}/{max_retries})..."
                )
                continue

            # Check for valid HTML content
            if "<html" not in resp.text.lower():
                print(
                    f"[!] Invalid HTML on {url}, retrying ({attempt + 1}/{max_retries})..."
                )
                continue

            # Success!
            return resp.text

        except Exception as e:
            print(
                f"[!] Error fetching {url}: {e}, retrying ({attempt + 1}/{max_retries})..."
            )

    return None


def scrape_job_detail(
    scraper, card, base_url: str, link: str, companies: dict, headers: dict
):
    """Scrape individual job detail page."""
    job_url = urljoin(base_url, link)
    if "brand" in job_url:
        return

    print(f"  📄 {job_url}")

    job_title_elem = card.select_one("h3.title a") or card.select_one("h3.title")
    job_title = safe_text(job_title_elem, normalize_camel_case=False)
    company_name = safe_text(card.select_one("a.company"))

    # salary
    salary = safe_text(card.select_one("label.title-salary"))
    salary_min, salary_max = extract_salary(salary)

    # date_posted
    date_posted_elem = card.select_one("label.deadline") or card.select_one("label.label-update")
    date_posted = None
    if date_posted_elem:
        try:
            date_posted = vn_parse_posted_date(safe_text(date_posted_elem))
        except Exception:
            pass

    # logo
    logo = None
    img = card.find("img")
    if img and img.has_attr("src"):
        logo = img["src"]

    # skills from card
    skill_wrap = card.select_one("div.skills")
    skills = []

    if skill_wrap:
        skill_items = skill_wrap.select("label.item")
        for item in skill_items:
            skill = safe_text(item)
            if skill:
                if not re.fullmatch(r"^\d+\+$", skill):
                    skills.append(skill)
                else:
                    if "title" in item.attrs:
                        fields = item["title"].split(", ")
                        skills.extend(fields)

    # location
    addr_elem = card.select_one("label.address")
    location = safe_text(addr_elem).split(" &")[0].split(", ") if addr_elem else []

    # end_date
    time_elem = card.select_one("label.time")
    end_date = None
    if time_elem:
        strong = time_elem.find("strong")
        if strong:
            try:
                remain_days = int(safe_text(strong))
                now = datetime.now()
                end_date = now + timedelta(days=remain_days)
            except:
                pass

    # Add delay before detail page
    human_delay(2, 3)

    # Get into job page with referer
    detail_headers = {"Referer": base_url}
    resp_text = fetch_with_retry(
        scraper, job_url, headers=detail_headers, max_retries=3, base_delay=3
    )

    if not resp_text:
        print("    ⚠️ Failed to fetch job detail page")
        # Still add the job with card data
        if company_name not in companies:
            companies[company_name] = {
                "logo": logo,
                "address": [],
                "description": "",
                "employees_min": None,
                "employees_max": None,
                "website_url": None,
                "crawled_at": datetime.now(),
                "source": "topcv",
                "jobs": {},
            }
        companies[company_name]["jobs"][job_title] = {
            "description": "",
            "locations": location,
            "job_url": job_url,
            "date_posted": date_posted,
            "skills": [s for s in skills if not is_likely_province(s)],
            "end_date": end_date,
            "experience_min": None,
            "crawled_at": datetime.now(timezone.utc),
            "salary_min": salary_min,
            "salary_max": salary_max,
            "source": "topcv",
        }
        return

    soup = BeautifulSoup(resp_text, "html.parser")

    # description — mixed content (markdown headings + raw HTML)
    description_wrap = soup.select_one("div.job-description")
    if description_wrap:
        # Remove the main heading "Chi tiết tin tuyển dụng"
        main_h2 = description_wrap.find("h2")
        if main_h2:
            main_h2.decompose()
        # Remove non-description sections (location, work hours, apply method, custom form)
        EXCLUDE_KEYWORDS = {"địa điểm", "thời gian", "cách thức", "dia diem", "thoi gian", "cach thuc"}
        for item in description_wrap.select("div.job-description__item"):
            h3 = item.find("h3")
            if h3:
                h3_text = h3.get_text(strip=True).lower()
                if any(kw in h3_text for kw in EXCLUDE_KEYWORDS):
                    item.decompose()
        for form_div in description_wrap.select("div.job-description__custom-form-job"):
            form_div.decompose()
        description = html_to_mixed_content(description_wrap)
    else:
        description = ""

    # experiences
    exp_elem = soup.select_one("div#job-detail-info-experience")
    experience_min = extract_experience_years(safe_text(exp_elem)) if exp_elem else None

    # Re-extract skills from detail page
    detail_skills = []
    skills_section = soup.find(
        "h3",
        string=lambda t: (
            t
            and (
                "kỹ năng" in t.lower()
                or "yêu cầu" in t.lower()
                or "skills" in t.lower()
            )
        ),
    )
    if skills_section:
        skill_container = skills_section.find_next_sibling()
        if skill_container:
            skill_items = skill_container.find_all(["a", "span", "label"])
            for item in skill_items:
                skill_text = safe_text(item)
                if (
                    skill_text
                    and len(skill_text) > 1
                    and skill_text != "N/A"
                    and not re.match(r"^\d+\+$", skill_text)
                    and skill_text not in location
                    and not is_likely_province(skill_text)
                ):
                    detail_skills.append(skill_text)

    if detail_skills:
        skills = list(set(skills + detail_skills))

    skills = [s for s in skills if not is_likely_province(s)]

    # Company info
    comp_addr = []
    company_website = None
    company_description = ""
    employees_min, employees_max = None, None

    company_link = soup.select_one("a.company-logo")
    if company_link and company_link.get("href"):
        company_url = company_link["href"]

        human_delay(2, 3)

        comp_headers = {"Referer": job_url}
        comp_text = fetch_with_retry(
            scraper, company_url, headers=comp_headers, max_retries=2, base_delay=3
        )

        if comp_text:
            comp_soup = BeautifulSoup(comp_text, "html.parser")

            desc_elem = comp_soup.select_one("div.desc")
            if desc_elem:
                comp_addr = [safe_text(desc_elem)]

            box_body = comp_soup.select_one("div.box-body")
            if box_body:
                for p in box_body.find_all("p"):
                    company_description += safe_text(p) + " "
                company_description = company_description.replace("N/A", "").strip()

            info_wrap = comp_soup.find_all("span", class_="company-subdetail-info-text")
            for item in info_wrap:
                if item.has_attr("href"):
                    company_website = item["href"]
                text = safe_text(item)
                if "nhân viên" in text:
                    employees_min, employees_max = extract_employees(
                        text.replace("nhân viên", "")
                    )

    if company_name not in companies:
        companies[company_name] = {
            "logo": logo,
            "address": comp_addr,
            "description": company_description,
            "employees_min": employees_min,
            "employees_max": employees_max,
            "website_url": company_website,
            "crawled_at": datetime.now(),
            "source": "topcv",
            "jobs": {},
        }

    companies[company_name]["jobs"][job_title] = {
        "description": description,
        "locations": location,
        "job_url": job_url,
        "date_posted": date_posted,
        "skills": skills,
        "end_date": end_date,
        "experience_min": experience_min,
        "crawled_at": datetime.now(timezone.utc),
        "salary_min": salary_min,
        "salary_max": salary_max,
        "source": "topcv",
    }

    print(f"    ✓ {job_title}")


def scrape_page(scraper, page_num, headers, max_jobs_per_page=None):
    """Scrape TopCV listing page."""
    base_url = "https://www.topcv.vn/tim-viec-lam-cong-nghe-thong-tin-cr257"
    listing_url = f"{base_url}?type_keyword=1&sba=1&category_family=r257&page={page_num}"

    print(f"\n--- TopCV listing page {page_num} ---")

    # Use stealth headers for listing page
    listing_headers = None

    html = fetch_with_retry(
        scraper, listing_url, headers=listing_headers, max_retries=5, base_delay=5
    )
    if not html:
        print(f"Failed to fetch listing page {page_num}")
        return {}

    soup = BeautifulSoup(html, "html.parser")
    companies = {}

    job_cards = soup.find_all("div", class_="job-item-search-result")
    print(f"Found {len(job_cards)} job cards")

    if max_jobs_per_page:
        job_cards = job_cards[:max_jobs_per_page]
        print(f"[TopCV] Limiting to {max_jobs_per_page} jobs per page")

    for idx, card in enumerate(job_cards):
        try:
            link_elem = card.find("a")
            if not link_elem:
                continue
            link = link_elem.get("href", "").replace(
                "?ta_source=ITJobs_LinkDetail", "", 1
            )

            print(f"\n[{idx + 1}/{len(job_cards)}] Processing job...")
            scrape_job_detail(scraper, card, base_url, link, companies, headers)

            # Longer delay between jobs to avoid rate limiting
            human_delay(3, 4)

        except Exception as e:
            print(f"    ⚠️ Error: {e}")
            continue

    return companies


def topcv_crawl(pages: int = 1, start_page: int = 1, max_jobs_per_page: int = 10):
    """Crawl TopCV listing pages with enhanced anti-detection.

    Args:
        pages: Number of listing pages to crawl
        start_page: Starting page number
        max_jobs_per_page: Maximum jobs to scrape per page (default 10)
    """
    print(
        f"\n🔄 [TopCV] Starting crawl (pages {start_page}-{start_page + pages - 1}, max {max_jobs_per_page} jobs/page)"
    )

    # Create stealth scraper
    scraper = create_stealth_scraper()
    headers = get_stealth_headers()

    all_companies = {}

    for page_num in range(start_page, start_page + pages):
        attempts = 0
        page_companies = {}

        while attempts < 3:
            try:
                attempts += 1
                print(f"\nScraping page {page_num} (attempt {attempts})")

                # Create fresh scraper for each page to rotate fingerprint
                if attempts > 1:
                    scraper = create_stealth_scraper()
                    headers = get_stealth_headers()

                page_companies = scrape_page(
                    scraper, page_num, headers, max_jobs_per_page
                )
                break
            except Exception as e:
                print(f"Error on page {page_num}: {e}")
                if attempts >= 3:
                    print(f"Skipping page {page_num} after 3 failures.")
                    break
                # Longer wait between retry attempts
                human_delay(10, 5)

        # Merge companies
        for name, data in page_companies.items():
            if name not in all_companies:
                all_companies[name] = data
            else:
                all_companies[name]["jobs"].update(data.get("jobs", {}))

        # Longer delay between pages
        if page_num < start_page + pages - 1:
            delay = random.uniform(8, 15)
            print(f"\n⏳ Waiting {delay:.1f}s before next page...")
            time.sleep(delay)

    return all_companies