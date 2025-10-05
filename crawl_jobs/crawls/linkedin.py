import requests
from datetime import datetime, timezone
from bs4 import BeautifulSoup

from helpers import (
    get_headers, 
    safe_text, 
    process_province, 
    parse_posted_date, 
    human_delay,
    extract_employees
)


def linkedin_crawl():
    companies = {}

    headers = get_headers()

    job_ids = get_job_ids(headers)

    # Crawl job details for each job ID
    detail_url = "https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{}"
    for job_id in job_ids:
        job_url = detail_url.format(job_id)
        res = requests.get(job_url, headers=headers)
        soup = BeautifulSoup(res.text, "html.parser")

        # company_name
        company_name = soup.select_one("div.top-card-layout__card").find("a").find("img").get("alt")

        # job_title
        job_title = soup.select_one("div.top-card-layout__entity-info").find("a").text.strip()

        # logo
        logo = soup.select_one("img.artdeco-entity-image")["data-delayed-url"]

        # locations
        locations = process_province(safe_text(soup.select_one("span.topcard__flavor--bullet")).split(", "))

        # date_posted
        date_posted = safe_text(soup.select_one("span.posted-time-ago__text")).replace("s", "")
        process = parse_posted_date(date_posted)

        # description
        desc_wrap = soup.select_one("div.show-more-less-html__markup")
        description_parts = [{"title": "", "body": safe_text(desc_wrap, is_strip=False, sep="\n").strip()}]

        human_delay(base=3, jitter=2)

        # --- Company page ---
        print(job_url)
        company_url = soup.find("a")["href"]

        comp_res = requests.get(company_url, headers=headers)
        comp_soup = BeautifulSoup(comp_res.text, "html.parser")

        # company_desc
        company_desc = safe_text(comp_soup.select_one("span.line-clamp-2"))

        # company_website_url
        comp_wrap = comp_soup.select_one("dl.mt-6")
        comp_web_url = safe_text(comp_wrap.find("a"))

        dd = comp_wrap.find_all("dd")

        # company_size
        company_size = safe_text(dd[2]).strip()

        # comp_addr
        comp_addr = [safe_text(dd[3])]

        if company_name not in companies:
            companies[company_name] = {
                "logo": logo,
                "address": comp_addr,
                "description": company_desc,
                "website_url": comp_web_url,
                "crawled_at": datetime.now(),
                "source": "linkedin",  
                "jobs": {}
            }

        companies[company_name]["jobs"][job_title] = {
            "description": description_parts,
            "locations": locations,
            "job_url": job_url,
            "date_posted": process,
            "crawled_at": datetime.now(timezone.utc),
            "source": "linkedin"
        }

    return companies


def get_job_ids(headers) -> list:
    job_ids = []
    search_url = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/" \
                    "search?keywords=Web+Development&location=Vietnam&geoId=104195383&f_TPR=r604800&start={}"

    for i in range(0, 37):
        res = requests.get(search_url.format(i), headers=headers)
        soup = BeautifulSoup(res.text, "html.parser")
        jobs_on_page = soup.find_all("li")
        print(f"--- Found {len(jobs_on_page)} jobs on page {i} of Linkedin ---")

        for job in jobs_on_page:
            job_id = job.select_one("div.base-card").get("data-entity-urn").split(":")[3]
            job_ids.append(job_id)
        
        human_delay(base=1, jitter=0)
    
    return job_ids