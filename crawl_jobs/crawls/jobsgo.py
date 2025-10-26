from datetime import datetime, timezone

from bs4 import BeautifulSoup

from crawl_jobs.helpers.helper import (
    safe_text, 
    extract_salary, 
    vn_parse_posted_date, 
    extract_experience_years_jobsgo,
    fetch_page,
    crawl
)


def scrape_job_detail(scraper, card, job_url: str, companies: dict):
    print(job_url)

    # company_name
    company_name = safe_text(card.select_one("div.company-title"))

    # logo
    logo = card.find("img")["src"]
    if logo == "https://media.jobsgo.vn/media/img/employer/98495-200x200.jpg?v=1670378027":
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
            experience_min, experience_max = extract_experience_years_jobsgo(safe_text(span))


    resp = scraper.get(job_url)
    soup = BeautifulSoup(resp.text, "html.parser")

    job_title = safe_text(soup.select_one("h1.job-title"))

    body = soup.select_one("div.tab-pane")

    # skills
    skills = []

    skill_wrap = body.find_all("a")
    for skill in skill_wrap[:-1]:
        skills.append(safe_text(skill))
    

    
    # category
    category = skills[0]
    
    # description
    description_parts = []
    desc_wrap = soup.select_one("div.job-detail-card")
    title_wrap = desc_wrap.find_all("h3")
    body_wrap = desc_wrap.find_all("div")

    for index in range(0, len(title_wrap)):
        description_parts.append({
            "title": safe_text(title_wrap[index]),
            "body": safe_text(body_wrap[index])
        })

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
            "jobs": {}
        }

    companies[company_name]["jobs"][job_title] = {
        "description": description_parts,
        "locations": locations,
        "job_url": job_url,
        "date_posted": date_posted,
        "category": category,
        "skills": skills,
        "experience_min": experience_min,
        "experience_max": experience_max,
        "crawled_at": datetime.now(timezone.utc),
        "salary_min": salary_min,
        "salary_max": salary_max,
        "source": "jobsgo"
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


def jobsgo_crawl():
    return crawl(scrape_page, delay=1, jitter=0)