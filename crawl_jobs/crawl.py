import csv
import time
from urllib.parse import urlparse, urljoin
from concurrent.futures import ThreadPoolExecutor, as_completed

import cloudscraper
from bs4 import BeautifulSoup

def clean_job_url(url: str) -> str:
    p = urlparse(url)
    parts = [seg for seg in p.path.split("/") if seg]
    if len(parts) >= 2 and parts[0] == "it-jobs" and parts[1] == "it-jobs":
        parts.pop(1)
    if parts and parts[-1] == "content":
        parts.pop()
    return f"{p.scheme}://{p.netloc}/{'/'.join(parts)}"


def safe_text(el):
    if not el:
        return "N/A"
    txt = el.get_text(strip=True)
    return txt if txt else "N/A"


def scrape_job_detail(scraper, base_url, link):
    job_url = urljoin(base_url, link)
    try:
        resp = scraper.get(clean_job_url(job_url))
    except Exception as e:
        print(f"Error fetching job detail {job_url}: {e}")
        return None

    soup = BeautifulSoup(resp.text, "html.parser")

    job_title = safe_text(soup.find("h1"))
    employer_name = safe_text(soup.select_one(".employer-name"))

    # Logo
    logo_tag = soup.find("img", class_="employer-logo")
    logo = "N/A"
    if logo_tag:
        logo = (logo_tag.get("src") or logo_tag.get("data-src") or "").strip() or "N/A"

    # Location
    location = "N/A"
    loc_wrap = soup.find("div", class_="imb-3")
    if loc_wrap:
        loc_a = loc_wrap.find("a")
        if loc_a and loc_a.get("href"):
            location = loc_a.get("href").strip() or "N/A"

    # Skills
    skills = []
    skill_wrap = loc_wrap.find("div", class_="igap-2") if loc_wrap else None
    if skill_wrap:
        skills = [safe_text(a) for a in skill_wrap.find_all("a")]

    # Description sections
    description_parts = []
    for paragraph in soup.find_all("div", class_="paragraph"):
        title = safe_text(paragraph.find("h2"))
        body_items = [li.get_text(strip=True) for li in paragraph.find_all("li")]
        body_text = ", ".join(b for b in body_items if b) or "N/A"
        description_parts.append(f"[title]: {title} [body]: {body_text}")
    description = "; ".join(description_parts) if description_parts else "N/A"

    return {
        "job_title": job_title,
        "employer_name": employer_name,
        "logo": logo,
        "location": location,
        "skills": ", ".join(skills) if skills else "N/A",
        "description": description,
    }


def scrape_page(scraper, page_num: int, max_workers=8):
    base_url = "https://itviec.com/it-jobs"
    listing_url = f"{base_url}?page={page_num}"
    print(f"--- Scraping listing page {page_num} ---")
    jobs = []

    try:
        html = scraper.get(listing_url).text
    except Exception as e:
        print(f"Error fetching listing page {page_num}: {e}")
        return jobs

    soup = BeautifulSoup(html, "html.parser")
    job_cards = soup.find_all("div", class_="job-card")
    links = [card["data-search--job-selection-job-url-value"] for card in job_cards]

    for link in links:
        job = scrape_job_detail(scraper, base_url, link)
        if job:
            jobs.append(job)

    return jobs


def main():
    scraper = cloudscraper.create_scraper()
    all_jobs = []

    for page_num in range(1, 50):
        all_jobs.extend(scrape_page(scraper, page_num))
        time.sleep(2)

    with open("jobs.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["no", "job_title", "employer_name",
                         "logo", "location", "skills", "description"])
        for idx, job in enumerate(all_jobs, start=1):
            writer.writerow([
                idx,
                job["job_title"],
                job["employer_name"],
                job["logo"],
                job["location"],
                job["skills"],
                job["description"]
            ])
    print(f"Saved {len(all_jobs)} jobs to jobs.csv")


if __name__ == "__main__":
    main()
