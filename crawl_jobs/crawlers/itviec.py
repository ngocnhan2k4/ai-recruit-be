import re
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

from helpers.http import crawl
from helpers.extraction import extract_employees
from helpers.text import safe_text
from helpers.date import get_date_posted, parse_posted_date
from helpers.province import is_likely_province


def clean_job_url(url: str) -> str:
    p = urlparse(url)
    parts = [seg for seg in p.path.split("/") if seg]
    if len(parts) >= 2 and parts[0] == "it-jobs" and parts[1] == "it-jobs":
        parts.pop(1)
    if parts and parts[-1] == "content":
        parts.pop()
    return f"{p.scheme}://{p.netloc}/{'/'.join(parts)}"


def scrape_job_detail(
    scraper, base_url: str, link: str, companies: dict, locations: list
):
    job_url = urljoin(base_url, link)
    resp = scraper.get(clean_job_url(job_url))

    soup = BeautifulSoup(resp.text, "html.parser")

    job_title = safe_text(soup.find("h1"))
    company_name = safe_text(soup.select_one(".employer-name"))

    logo_tag = soup.find("img", class_="employer-logo")
    logo = (
        (logo_tag.get("src") or logo_tag.get("data-src") or "").strip()
        if logo_tag
        else None
    )

    # date posted
    imb_3_wrap = soup.find("div", class_="imb-3")
    date_posted = None
    if imb_3_wrap:
        span_text = get_date_posted(imb_3_wrap.find_all("span"))
        if span_text:
            date_posted = parse_posted_date(span_text)

    print(clean_job_url(job_url))

    # category
    category = None
    if imb_3_wrap:
        category = safe_text(imb_3_wrap.find_all("a", class_="itag")[-1])

    # skills - improved extraction with province filtering
    skills = []
    
    # First try to find a skills section by header
    skills_section = soup.find("h2", string=lambda t: t and ("skills" in t.lower() or "kỹ năng" in t.lower()))
    if skills_section:
        skill_container = skills_section.find_next_sibling("div")
        if skill_container:
            for a in skill_container.find_all("a", class_="itag"):
                skill_text = safe_text(a)
                if (skill_text and 
                    skill_text != "N/A" and
                    skill_text not in locations and
                    not is_likely_province(skill_text)):
                    skills.append(skill_text)
    
    # Fallback to original igap-2 div if more specific fails
    if not skills and imb_3_wrap:
        skill_wrap = imb_3_wrap.find("div", class_="igap-2")
        if skill_wrap:
            for a in skill_wrap.find_all("a", class_="itag"):
                skill_text = safe_text(a)
                if (skill_text and 
                    skill_text != "N/A" and
                    skill_text not in locations and
                    not is_likely_province(skill_text)):
                    skills.append(skill_text)

    # description
    description_parts = []
    for p in soup.find_all("div", class_="paragraph"):
        title = safe_text(p.find("h2"))
        body_items = [li.get_text(strip=True) for li in p.find_all("li")]
        body_text = ", ".join(b for b in body_items if b) or "N/A"
        description_parts.append({"title": title, "body": body_text})
    description = description_parts if description_parts else []

    # --- Company page ---
    company_url_tag = soup.find("section", class_="job-show-employer-info").find("a")
    company_size = None
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

        company_description_wrap = comp_soup.find("div", class_="paragraph")

        # Company Website
        website_wrap = comp_soup.find("div", class_="ipe-4")
        website_url = None
        if website_wrap:
            website_url = website_wrap.get("data-redirect-url-url-value")

    if company_name not in companies:
        min, max = extract_employees(company_size)

        companies[company_name] = {
            "logo": logo,
            "description": safe_text(company_description_wrap, is_strip=False)
            .replace("\n", "", 1)
            .replace("\n", ". ", -1)
            .replace("\xa0", " ", -1),
            "employees_min": min,
            "employees_max": max,
            "website_url": website_url,
            "crawled_at": datetime.now(),
            "source": "itviec",
            "jobs": {},
        }

    companies[company_name]["jobs"][job_title] = {
        "description": description,
        "locations": locations,
        "category": category,
        "job_url": clean_job_url(job_url),
        "date_posted": date_posted,
        "skills": skills,
        "crawled_at": datetime.now(timezone.utc),
        "source": "itviec",
    }


def scrape_page(scraper, page_num, headers):
    base_url = "https://itviec.com/it-jobs"
    listing_url = f"{base_url}?page={page_num}"

    print(f"--- Scraping Itviec listing page {page_num} ---")

    html = scraper.get(listing_url).text
    soup = BeautifulSoup(html, "html.parser")

    companies = {}

    for card in soup.find_all("div", class_="job-card"):
        link = card["data-search--job-selection-job-url-value"]

        loc_text = safe_text(card.find("div", class_="text-truncate"))
        locations = [location.strip() for location in loc_text.split("-") if location]

        scrape_job_detail(scraper, base_url, link, companies, locations)

    return companies


def itviec_crawl(pages: int = 1, start_page: int = 1):
    """
    Crawl ITViec job listings.

    Args:
        pages: Number of listing pages to crawl
        start_page: Starting page number

    Returns:
        Dictionary of companies and their jobs
    """
    print(f"[ITViec] Crawling (page {start_page})")
    return crawl(scrape_page, delay=1, jitter=0, pages=pages, start_page=start_page)
