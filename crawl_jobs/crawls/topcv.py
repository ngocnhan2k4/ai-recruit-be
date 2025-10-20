import re
from datetime import datetime, timedelta, timezone
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from helpers import (
    safe_text, 
    extract_salary, 
    vn_parse_posted_date, 
    extract_experience_years, 
    extract_employees, 
    human_delay, 
    fetch_page,
    crawl
)


def scrape_job_detail(scraper ,card, base_url: str, link: str, companies: dict):
    job_url = urljoin(base_url, link)
    if "brand" in job_url:
        return

    print(job_url)

    job_title = safe_text(card.select_one("h3.title"))
    company_name = safe_text(card.select_one("a.company"))

    # salary
    salary = safe_text(card.select_one("label.title-salary"))
    salary_min, salary_max = extract_salary(salary)

    # date_posted
    date_posted = vn_parse_posted_date(safe_text(card.select_one("label.deadline")))

    # logo
    logo = None
    if card.find("img").has_attr("src"):
        logo = card.find("img")["src"]

    # skills
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
    location = safe_text(card.select_one("label.address")).split(" &")[0].split(", ")

    # end_date
    remain_days = int(safe_text(card.select_one("label.time").find("strong")))
    now = datetime.now()
    delta = timedelta(days=remain_days)

    end_date = now - delta

    # Get into job page
    resp = scraper.get(job_url)
    soup = BeautifulSoup(resp.text, "html.parser")

    # description
    description_parts = []
    description_wrap = soup.select_one("div.job-description")

    for d in description_wrap.find_all("div", class_="job-description__item"):
        title = safe_text(d.find("h3"))
        body = safe_text(d.find("p"))

        if body != "N/A":
            description_parts.append({
                "title": title,
                "body": body
            })

    # experiences
    experiences = safe_text(soup.select_one("div#job-detail-info-experience"))
    experience_min = extract_experience_years(experiences)

    human_delay(3, 5)

    # --- Company page ---
    company_url = soup.select_one("a.company-logo")["href"]
    company_website = None
    company_description = ""

    if company_url:
        comp_resp = scraper.get(company_url)
        comp_soup = BeautifulSoup(comp_resp.text, "html.parser")

        # company_addr
        comp_addr = [safe_text(comp_soup.select_one("div.desc"))]

        # company_description
        company_desc_wrap = comp_soup.select_one("div.box-body").find_all("p")
        for p in company_desc_wrap:
            company_description += safe_text(p) + " "
        company_description = company_description.replace("N/A", "").strip()

        # company_size
        employees_min, employees_max = None, None
        info_wrap = comp_soup.find_all("span", class_="company-subdetail-info-text")
        for item in info_wrap:
            # company_website_url
            if item.has_attr("href"):
                company_website = item["href"]


            text = safe_text(item)
            if "nhân viên" in text:
                employees_min, employees_max = extract_employees(text.replace("nhân viên", ""))

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
            "jobs": {}
        }

    companies[company_name]["jobs"][job_title] = {
        "description": description_parts,
        "locations": location,
        "job_url": job_url,
        "date_posted": date_posted,
        "skills": skills,
        "end_date": end_date,
        "experience_min": experience_min,
        "crawled_at": datetime.now(timezone.utc),
        "salary_min": salary_min,
        "salary_max": salary_max,
        "source": "topcv"
    }


def scrape_page(scraper, page_num, headers):
    base_url = "https://www.topcv.vn/viec-lam-it"
    listing_url = f"{base_url}?page={page_num}"

    print(f"--- Scraping TopCV listing page {page_num} ---")

    html = fetch_page(scraper, listing_url, headers=headers)
    if not html:
        print(f"Failed to fetch listing page {page_num}")
        return {}

    soup = BeautifulSoup(html, "html.parser")

    companies = {}

    for card in soup.find_all("div", class_="job-item-2"):
        link = card.find("a")["href"].replace("?ta_source=ITJobs_LinkDetail", "", 1)

        scrape_job_detail(scraper, card, base_url, link, companies)

    return companies


def topcv_crawl():
    return crawl(scrape_page, delay=3, jitter=6)