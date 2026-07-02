from datetime import datetime, timezone

from bs4 import BeautifulSoup
from helpers.date import vn_parse_posted_date
from helpers.extraction import extract_experience_years_jobsgo, extract_salary
from helpers.http import crawl, fetch_page
from helpers.province import is_likely_province
from helpers.text import html_to_mixed_content, safe_text


def scrape_job_detail(scraper, card, job_url: str, companies: dict):
    print(job_url)

    # company_name
    company_name = safe_text(card.select_one("div.company-title"))

    # logo
    logo = card.find("img")["src"]
    if (
        logo
        == "https://media.jobsgo.vn/media/img/employer/98495-200x200.jpg?v=1670378027"
    ):
        return

    div_wrap = card.select_one("div.align-items-center").find_all("span")

    # salary
    salary_min, salary_max = extract_salary(safe_text(div_wrap[0]).replace(" VNĐ", ""))

    # locations
    locations = safe_text(div_wrap[2]).replace(",...", "").split(", ")

    # date posted
    date_posted = None

    # experiences
    experience_min, experience_max = None, None

    span_wrap = card.select_one("div.justify-content-between")
    for span in span_wrap.find_all("span"):
        if span["title"] == "Thời gian cập nhật":
            date_posted = vn_parse_posted_date(safe_text(span))
        elif span["title"] == "Yêu cầu kinh nghiệm":
            experience_min, experience_max = extract_experience_years_jobsgo(
                safe_text(span)
            )

    resp = scraper.get(job_url)
    soup = BeautifulSoup(resp.text, "html.parser")

    job_title = safe_text(soup.select_one("h1.job-title"), normalize_camel_case=False)
    company_name_tag = soup.select_one("div.media-body h2")

    body = soup.select_one("div.tab-pane")

    # skills - improved extraction with province filtering
    skills = []

    # First, try to find skills in the requirements section
    requirements_section = soup.find(
        "h3",
        string=lambda t: (
            t and ("yêu cầu công việc" in t.lower() or "kỹ năng" in t.lower())
        ),
    )
    if requirements_section:
        skill_container = requirements_section.find_next_sibling("div")
        if skill_container:
            skill_links = skill_container.find_all("a")
            for skill_link in skill_links:
                skill_text = safe_text(skill_link)
                # Filter out provinces and invalid skills
                if (
                    skill_text
                    and len(skill_text) > 1
                    and skill_text != "N/A"
                    and skill_text not in locations
                    and not is_likely_province(skill_text)
                ):
                    skills.append(skill_text)

    # Fallback: look in the tab pane but with stricter filtering
    if not skills and body:
        skill_wrap = body.find_all("a")
        for skill in skill_wrap[:-1]:  # Skip last link (usually "apply" or navigation)
            skill_text = safe_text(skill)
            # Filter out provinces and invalid skills
            if (
                skill_text
                and len(skill_text) > 1
                and skill_text != "N/A"
                and skill_text not in locations
                and not is_likely_province(skill_text)
            ):
                skills.append(skill_text)

    # description — mixed content (markdown headings + raw HTML)
    desc_wrap = soup.select_one("div.job-detail-card")
    if desc_wrap:
        # Remove metadata sections (Kỹ năng, Ngành nghề, etc.)
        for meta_div in desc_wrap.select("div.d-flex.align-items-start.my-4"):
            meta_div.decompose()
        # Remove the main card title ("Chi Tiết Công Việc")
        card_title = desc_wrap.select_one("h2.card-title")
        if card_title:
            card_title.decompose()
        description = html_to_mixed_content(desc_wrap)
    else:
        description = ""

    # --- Company page ---
    company_url = soup.select_one("div.card-company").find("a")["href"]
    if company_url == "javascript:void(0)":
        return
    elif company_url:
        comp_resp = scraper.get(company_url)
        comp_soup = BeautifulSoup(comp_resp.text, "html.parser")

        # company_desc
        company_desc = safe_text(comp_soup.select_one("div#company-description"))

        if comp_soup.select_one("nav.teks-shadow"):
            return

        comp_info_wrap = comp_soup.select_one("ul.list-icon-box")

        # Company Website
        website_li = comp_info_wrap.find("i", class_="pb-heroicons-globe-alt")
        website_url = None
        if website_li:
            website_span = website_li.find_next("span")
            if website_span and website_span.find("a"):
                website_url = website_span.find("a")["href"]

        # comp_addr
        addr_li = comp_info_wrap.find("i", class_="pb-heroicons-map-pin")
        comp_addr = None
        if addr_li:
            addr_span = addr_li.find_next("span")
            if addr_span:
                comp_addr = safe_text(addr_span, is_strip=False).split("\n")

        comp_addr = [address.strip() for address in comp_addr]

    if company_name not in companies:
        companies[company_name] = {
            "logo": logo,
            "address": comp_addr,
            "description": company_desc,
            "website_url": website_url,
            "crawled_at": datetime.now(),
            "source": "jobsgo",
            "jobs": {},
        }

    companies[company_name]["jobs"][job_title] = {
        "description": description,
        "locations": locations,
        "job_url": job_url,
        "date_posted": date_posted,
        "skills": skills,
        "experience_min": experience_min,
        "experience_max": experience_max,
        "crawled_at": datetime.now(timezone.utc),
        "salary_min": salary_min,
        "salary_max": salary_max,
        "source": "jobsgo",
    }


def scrape_page(scraper, page_num, headers):
    base_url = "https://jobsgo.vn/viec-lam-cong-nghe-thong-tin.html"
    listing_url = f"{base_url}?page={page_num}"

    print(f"--- Scraping JobsGo listing page {page_num} ---")

    html = fetch_page(scraper, listing_url, headers=headers)
    if not html:
        print(f"Failed to fetch listing page {page_num}")
        return {}

    soup = BeautifulSoup(html, "html.parser")

    companies = {}

    for card in soup.find_all("div", class_="job-card"):
        link = card.find("a")["href"]

        scrape_job_detail(scraper, card, link, companies)

    return companies


def jobsgo_crawl(pages: int = 1, start_page: int = 1):
    """Crawl JobsGO listing pages."""
    return crawl(scrape_page, delay=1, jitter=0, pages=pages, start_page=start_page)
