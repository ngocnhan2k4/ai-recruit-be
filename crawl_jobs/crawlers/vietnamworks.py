"""
VietnamWorks job crawler.

Crawls IT job listings from https://www.vietnamworks.com
Query parameter g=5 is for IT/Software jobs.

Note: VietnamWorks uses dynamically generated CSS class names (React/styled-components),
so we rely on structural selectors and tag-based patterns rather than specific class names.
"""

from datetime import datetime, timezone
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from helpers.extraction import extract_experience_years, extract_salary
from helpers.http import crawl, fetch_page, human_delay
from helpers.province import is_likely_province
from helpers.text import html_to_mixed_content, safe_text


def scrape_job_detail(scraper, job_url: str, job_data: dict, companies: dict):
    """Scrape individual job detail page."""
    print(f"  📄 {job_url}")

    try:
        resp = scraper.get(job_url)
        soup = BeautifulSoup(resp.text, "html.parser")

        # Job title
        title_elem = soup.select_one("h1")
        job_title = safe_text(title_elem) if title_elem else None
        if not job_title or job_title == "N/A":
            job_title = job_data.get("title", "Unknown Job")

        # Company name
        company_name = _extract_company_name(soup, job_data)

        # Company logo
        logo = _extract_logo(soup)

        # Locations
        locations = job_data.get("locations", [])
        if not locations:
            locations = _extract_locations(soup)

        # Salary
        salary_min, salary_max = _extract_salary(soup)

        # Experience
        experience_min = _extract_experience(soup)

        # Skills from requirements section
        skills = _extract_skills_from_sections(soup, locations)

        # skills already contains extracted tags
        # (Model extraction will be done asynchronously later)

        # Description — mixed content (markdown headings + raw HTML)
        description = _extract_description(soup)

        # Build company and job data
        if company_name not in companies:
            companies[company_name] = {
                "logo": logo,
                "address": [],
                "description": "",
                "employees_min": None,
                "employees_max": None,
                "website_url": None,
                "crawled_at": datetime.now(),
                "source": "vietnamworks",
                "jobs": {},
            }

        if logo and not companies[company_name].get("logo"):
            companies[company_name]["logo"] = logo

        companies[company_name]["jobs"][job_title] = {
            "description": description,
            "locations": locations,
            "job_url": job_url,
            "date_posted": job_data.get("date_posted"),
            "skills": skills[:15],
            "experience_min": experience_min,
            "crawled_at": datetime.now(timezone.utc),
            "salary_min": salary_min if salary_min else None,
            "salary_max": salary_max if salary_max else None,
            "source": "vietnamworks",
        }

        print(f"    ✓ {job_title} @ {company_name} ({len(skills)} skills)")

    except Exception as e:
        print(f"    ⚠️ Error: {e}")


def _extract_company_name(soup, job_data):
    """Extract company name from job detail page."""
    company_links = soup.select(
        "a[href*='/nha-tuyen-dung/'], a[href*='/employer/'], a[href*='/company/']"
    )
    if company_links:
        name = safe_text(company_links[0])
        if name and name != "N/A":
            return name

    # Fallback: header area
    header_section = soup.select_one(
        "header, .header, [class*='header'], [class*='company']"
    )
    if header_section:
        for link in header_section.select("a"):
            text = safe_text(link)
            if text and text != "N/A" and 2 < len(text) < 100:
                return text

    return job_data.get("company", "Unknown Company")


def _extract_logo(soup):
    """Extract company logo URL."""
    logo_candidates = soup.select(
        "img[src*='logo'], img[src*='company'], img[alt*='logo']"
    )
    if logo_candidates:
        return logo_candidates[0].get("src") or logo_candidates[0].get("data-src")

    header = soup.select_one("header, [class*='header'], [class*='company-info']")
    if header:
        img = header.select_one("img")
        if img:
            return img.get("src") or img.get("data-src")
    return None


def _extract_locations(soup):
    """Extract locations from page text."""
    cities = ["Hà Nội", "Hồ Chí Minh", "Đà Nẵng", "Cần Thơ", "Hải Phòng"]
    locations = []
    loc_candidates = soup.find_all(
        string=lambda t: t and any(city in t for city in cities)
    )
    for loc in loc_candidates[:2]:
        loc_text = str(loc).strip()
        if len(loc_text) < 50:
            locations.append(loc_text)
    return locations


def _extract_salary(soup):
    """Extract salary range from page text."""
    salary_candidates = soup.find_all(
        string=lambda t: (
            t
            and (
                "triệu" in t.lower()
                or "usd" in t.lower()
                or "thương lượng" in t.lower()
                or "lương" in t.lower()
            )
        )
    )
    for candidate in salary_candidates:
        text = str(candidate).strip()
        if len(text) < 100 and "thương lượng" not in text.lower():
            return extract_salary(text)
    return 0, 0


def _extract_experience(soup):
    """Extract experience requirement."""
    exp_candidates = soup.find_all(
        string=lambda t: (
            t
            and "năm" in t.lower()
            and ("kinh nghiệm" in t.lower() or "experience" in t.lower())
        )
    )
    for candidate in exp_candidates:
        text = str(candidate).strip()
        if len(text) < 100:
            result = extract_experience_years(text)
            if result:
                return result
    return None


def _extract_skills_from_sections(soup, locations):
    """Extract skills from requirement sections."""
    skills = []
    req_headers = soup.find_all(
        ["h2", "h3", "h4", "strong", "b"],
        string=lambda t: (
            t
            and (
                "yêu cầu" in t.lower() or "kỹ năng" in t.lower() or "skill" in t.lower()
            )
        ),
    )

    for header in req_headers:
        sibling = header.find_next_sibling()
        if sibling:
            for item in sibling.select("li")[:10]:
                skill_text = safe_text(item)
                if len(skill_text) > 50:
                    skill_text = skill_text.split(",")[0].strip()

                if (
                    skill_text
                    and skill_text != "N/A"
                    and 1 < len(skill_text) < 80
                    and not is_likely_province(skill_text)
                ):
                    skills.append(skill_text)
    return skills


def _extract_description(soup):
    """Extract job description as mixed markdown+HTML content."""
    desc_headers = soup.find_all(
        ["h2", "h3", "h4", "strong", "b"],
        string=lambda t: t and ("mô tả" in t.lower() or "description" in t.lower()),
    )

    if desc_headers:
        desc_html_parts = []
        for header in desc_headers:
            desc_html_parts.append(str(header))
            sibling = header.find_next_sibling()
            if sibling:
                desc_html_parts.append(str(sibling))
        return html_to_mixed_content("\n".join(desc_html_parts))

    # Fallback: main content area
    main_content = soup.select_one(
        "main, article, [class*='content'], [class*='description']"
    )
    if main_content:
        return html_to_mixed_content(main_content)

    return ""


def scrape_page(scraper, page_num, headers):
    """Scrape a single listing page."""
    base_url = "https://www.vietnamworks.com"
    listing_url = f"{base_url}/viec-lam?g=5&ignoreLocation=true&page={page_num}"

    print(f"\n--- VietnamWorks page {page_num}: {listing_url} ---")

    html = fetch_page(scraper, listing_url, headers=headers)
    if not html:
        print(f"Failed to fetch listing page {page_num}")
        return {}

    soup = BeautifulSoup(html, "html.parser")
    companies = {}

    # Find job links by URL pattern (-jv suffix)
    seen_urls = set()
    unique_jobs = []
    for link in soup.select("a[href*='-jv']"):
        href = link.get("href", "")
        if "-jv" in href and href not in seen_urls:
            if "/viec-lam?" in href or "/tim-viec-lam" in href:
                continue
            seen_urls.add(href)
            unique_jobs.append(link)

    print(f"Found {len(unique_jobs)} unique job links")

    if not unique_jobs:
        # Fallback: look for any job-like links
        for link in soup.select("a[href]"):
            href = link.get("href", "")
            if any(kw in href for kw in ["/job/", "/viec-lam/", "/tuyen-dung/"]):
                if href not in seen_urls:
                    seen_urls.add(href)
                    unique_jobs.append(link)
        print(f"Fallback: found {len(unique_jobs)} potential job links")

    for idx, job_link in enumerate(unique_jobs[:15]):
        try:
            href = job_link.get("href", "")
            job_url = urljoin(base_url, href)

            job_data = {
                "title": safe_text(job_link),
                "company": "",
                "locations": [],
                "date_posted": None,
            }

            parent = job_link.find_parent()
            if parent:
                company_elem = parent.find_next_sibling()
                if company_elem:
                    job_data["company"] = safe_text(company_elem)

            print(
                f"\n[{idx + 1}/{min(len(unique_jobs), 15)}] Processing: {job_data['title'][:50]}..."
            )
            scrape_job_detail(scraper, job_url, job_data, companies)
            human_delay(2, 3)

        except Exception as e:
            print(f"⚠️ Error processing job link: {e}")
            continue

    return companies


def vietnamworks_crawl(pages: int = 1, start_page: int = 1):
    """Crawl VietnamWorks IT job listings."""
    print(
        f"\n🔄 [VietnamWorks] Starting IT job crawl (pages {start_page}-{start_page + pages - 1})"
    )
    return crawl(scrape_page, delay=2, jitter=3, pages=pages, start_page=start_page)
