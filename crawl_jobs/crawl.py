import time
from urllib.parse import urlparse, urljoin
import re
from datetime import datetime, timezone

import cloudscraper
from bs4 import BeautifulSoup

from helpers import parse_posted_date, safe_text, get_date_posted

def clean_job_url(url: str) -> str:
    p = urlparse(url)
    parts = [seg for seg in p.path.split("/") if seg]
    if len(parts) >= 2 and parts[0] == "it-jobs" and parts[1] == "it-jobs":
        parts.pop(1)
    if parts and parts[-1] == "content":
        parts.pop()
    return f"{p.scheme}://{p.netloc}/{'/'.join(parts)}"


def scrape_job_detail(scraper, base_url: str, link: str, companies: dict):
    job_url = urljoin(base_url, link)
    resp = scraper.get(clean_job_url(job_url))
    soup = BeautifulSoup(resp.text, "html.parser")

    job_title = safe_text(soup.find("h1"))
    company_name = safe_text(soup.select_one(".employer-name"))

    logo_tag = soup.find("img", class_="employer-logo")
    logo = (logo_tag.get("src") or logo_tag.get("data-src") or "").strip() if logo_tag else None

    # date posted
    imb_3_wrap = soup.find("div", class_="imb-3")
    date_posted = None
    if imb_3_wrap:
        span_text = get_date_posted(imb_3_wrap.find_all("span"))
        if span_text:
            date_posted = parse_posted_date(span_text)

    # skills
    skills = []
    if imb_3_wrap:
        skill_wrap = imb_3_wrap.find("div", class_="igap-2")
        if skill_wrap:
            skills = [safe_text(a) for a in skill_wrap.find_all("a")]

    # description
    description_parts = []
    for p in soup.find_all("div", class_="paragraph"):
        title = safe_text(p.find("h2"))
        body_items = [li.get_text(strip=True) for li in p.find_all("li")]
        body_text = ", ".join(b for b in body_items if b) or "N/A"
        description_parts.append(f"title: {title} body: {body_text}")
    description = "; ".join(description_parts) if description_parts else "N/A"

    # --- Company page ---
    print(clean_job_url(job_url))
    company_url_tag = soup.find("section", class_="job-show-employer-info").find("a")
    company_size, locations = None, []
    if company_url_tag:
        company_url = urljoin(base_url, company_url_tag.get("href"))
        comp_resp = scraper.get(clean_job_url(company_url))
        comp_soup = BeautifulSoup(comp_resp.text, "html.parser")

        size_wrap = comp_soup.select_one("div.ipt-xl-4")
        if size_wrap:
            for div in size_wrap.find_all("div", class_="normal-text"):
                text = safe_text(div)
                if re.search(r"\d", text):
                    company_size = text.replace("\nemployees", "").strip()

        for span in comp_soup.select("div.locations span.text-break"):
            locations.append(safe_text(span))
    
        company_description_wrap = comp_soup.find("div", class_="paragraph")

    if company_name not in companies:
        companies[company_name] = {
            "logo": logo,
            "locations": locations,
            "description": safe_text(company_description_wrap, is_strip=False),
            "company_size": company_size,
            "website_url": company_url,
            "crawled_at": datetime.now(timezone.utc),
            "source": "itviec",
            "jobs": {}
        }

    companies[company_name]["jobs"][job_title] = {
        "description": description,
        "job_url": clean_job_url(job_url),
        "date_posted": date_posted,
        "skills": skills,
        "crawled_at": datetime.now(timezone.utc),
        "source": "itviec"
    }


def scrape_page(scraper, page_num):
    base_url = "https://itviec.com/it-jobs"
    listing_url = f"{base_url}?page={page_num}"

    print(f"--- Scraping listing page {page_num} ---")

    html = scraper.get(listing_url).text
    soup = BeautifulSoup(html, "html.parser")
    links = [card["data-search--job-selection-job-url-value"]
             for card in soup.find_all("div", class_="job-card")]

    companies = {}
    for link in links:
        scrape_job_detail(scraper, base_url, link, companies)

    return companies


def crawl_jobs():
    scraper = cloudscraper.create_scraper()
    all_companies = {}
    for page_num in range(1, 51):
        page_companies = scrape_page(scraper, page_num)

        for name, data in page_companies.items():
            if name not in all_companies:
                all_companies[name] = data
            else:
                all_companies[name]["jobs"].update(data["jobs"])
        time.sleep(2)

    return all_companies
