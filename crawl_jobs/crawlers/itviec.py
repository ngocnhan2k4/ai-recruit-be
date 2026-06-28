import re
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

from helpers.http import crawl
from helpers.extraction import extract_employees
from helpers.text import safe_text, html_to_mixed_content
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
    job_show_info = soup.find("div", class_="job-show-info")
    imb_3_wrap = job_show_info.find("div", class_="imb-3") if job_show_info else None

    date_posted = None
    if imb_3_wrap:
        span_text = get_date_posted(imb_3_wrap.find_all("span"))
        if span_text:
            date_posted = parse_posted_date(span_text)

    print(clean_job_url(job_url))

    # category
    category = None
    if imb_3_wrap:
        itags = imb_3_wrap.find_all("a", class_="itag")
        if itags:
            category = safe_text(itags[-1])

    # Skills extraction with province filtering
    def _collect_itag_skills(container):
        result = []
        for a in container.find_all("a", class_="itag"):
            t = safe_text(a)
            if t and t != "N/A" and t not in locations and not is_likely_province(t):
                result.append(t)
        return result

    skills = []
    skills_header = soup.find("h2", string=lambda t: t and ("skills" in t.lower() or "kỹ năng" in t.lower()))
    if skills_header:
        container = skills_header.find_next_sibling("div")
        if container:
            skills = _collect_itag_skills(container)

    if not skills and imb_3_wrap:
        skill_wrap = imb_3_wrap.find("div", class_="igap-2")
        if skill_wrap:
            skills = _collect_itag_skills(skill_wrap)

    # Description — mixed content (markdown headings + raw HTML)
    description_wrap = soup.find_all("div", class_="paragraph")
    if description_wrap:
        combined_html = "\n".join(str(p) for p in description_wrap)
        description = html_to_mixed_content(combined_html)
    else:
        description = ""

    # --- Company page ---
    company_info_sec = soup.find("section", class_="job-show-employer-info")
    company_url_tag = company_info_sec.find("a") if company_info_sec else None
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
        link = card.get("data-search--job-selection-job-url-value")
        if not link:
            continue

        loc_text = safe_text(card.find("div", class_="text-truncate"))
        locations = [location.strip() for location in loc_text.split("-") if location]

        scrape_job_detail(scraper, base_url, link, companies, locations)

    return companies


def itviec_crawl(pages: int = 1, start_page: int = 1):
    """Crawl ITViec job listings."""
    print(f"[ITViec] Crawling (page {start_page})")
    return crawl(scrape_page, delay=1, jitter=0, pages=pages, start_page=start_page)