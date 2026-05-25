from datetime import datetime, timezone

import requests
from bs4 import BeautifulSoup
from helpers.date import parse_posted_date
from helpers.extraction import extract_employee_range
from helpers.http import get_headers, human_delay
from helpers.province import process_province
from helpers.text import html_to_mixed_content, safe_text


def linkedin_crawl(
    pages: int = 1,
    start_page: int = 0,
    keywords: str = "Web Development",
):
    companies = {}
    headers = get_headers()

    job_ids = _get_job_ids(
        headers, pages=pages, start_page=start_page, keywords=keywords
    )

    detail_url = "https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{}"
    for job_id in job_ids:
        try:
            job_url = detail_url.format(job_id)
            res = requests.get(job_url, headers=headers)
            soup = BeautifulSoup(res.text, "html.parser")

            top_card = soup.select_one("div.top-card-layout__card")
            if not top_card:
                print(f"Skipping job {job_id}: no top card found")
                continue

            company_name = top_card.find("a").find("img").get("alt")
            job_title = (
                soup.select_one("div.top-card-layout__entity-info")
                .find("a")
                .text.strip()
            )

            logo_elem = soup.select_one("img.artdeco-entity-image")
            logo = logo_elem["data-delayed-url"] if logo_elem else None

            locations = process_province(
                safe_text(soup.select_one("span.topcard__flavor--bullet")).split(", ")
            )

            date_posted = safe_text(
                soup.select_one("span.posted-time-ago__text")
            ).replace("s", "")
            process = parse_posted_date(date_posted)

            # Description — mixed content (markdown headings + raw HTML)
            desc_wrap = soup.select_one("div.show-more-less-html__markup")
            description = html_to_mixed_content(desc_wrap) if desc_wrap else ""

            human_delay(base=3, jitter=2)

            # --- Company page ---
            print(job_url)
            company_url = soup.find("a")["href"]

            comp_res = requests.get(company_url, headers=headers)
            comp_soup = BeautifulSoup(comp_res.text, "html.parser")

            company_desc = safe_text(comp_soup.select_one("span.line-clamp-2"))

            comp_wrap = comp_soup.select_one("dl.mt-6")
            comp_web_url = safe_text(comp_wrap.find("a")) if comp_wrap else None

            dd = comp_wrap.find_all("dd") if comp_wrap else []

            employees_min, employees_max = None, None
            if len(dd) > 2:
                company_size = safe_text(dd[2]).strip()
                try:
                    employees_min, employees_max = extract_employee_range(company_size)
                except Exception as e:
                    print(
                        f"Could not parse employee range from '{company_size}'. Error: {e}"
                    )

            comp_addr = [safe_text(dd[3])] if len(dd) > 3 else []

            if company_name not in companies:
                companies[company_name] = {
                    "logo": logo,
                    "address": comp_addr,
                    "description": company_desc,
                    "employees_min": employees_min,
                    "employees_max": employees_max,
                    "website_url": comp_web_url,
                    "crawled_at": datetime.now(),
                    "source": "linkedin",
                    "jobs": {},
                }

            companies[company_name]["jobs"][job_title] = {
                "description": description,
                "locations": locations,
                "job_url": job_url,
                "date_posted": process,
                "skills": [],
                "crawled_at": datetime.now(timezone.utc),
                "source": "linkedin",
            }
        except Exception as e:
            print(f"⚠️ Error processing LinkedIn job {job_id}: {e}")
            continue

    return companies


def _get_job_ids(
    headers, pages: int = 1, start_page: int = 0, keywords: str = "Web Development"
) -> list:
    job_ids = []
    keywords_encoded = keywords.replace(" ", "+")
    search_url = f"https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords={keywords_encoded}&location=Vietnam&geoId=104195383&f_TPR=r604800&start={{}}"

    for i in range(start_page, start_page + pages):
        res = requests.get(search_url.format(i), headers=headers)
        soup = BeautifulSoup(res.text, "html.parser")
        jobs_on_page = soup.find_all("li")
        print(f"--- Found {len(jobs_on_page)} jobs on page {i} of Linkedin ---")

        for job in jobs_on_page:
            job_id = (
                job.select_one("div.base-card").get("data-entity-urn").split(":")[3]
            )
            job_ids.append(job_id)

        human_delay(base=1, jitter=0)

    return job_ids
