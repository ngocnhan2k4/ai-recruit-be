"""
VietnamWorks job crawler.

Crawls IT job listings from https://www.vietnamworks.com
Query parameter g=5 is for IT/Software jobs.
"""

from datetime import datetime, timezone
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from helpers.http import crawl, fetch_page, human_delay
from helpers.extraction import extract_salary, extract_experience_years
from helpers.text import safe_text
from helpers.date import vn_parse_posted_date
from helpers.province import is_likely_province


def scrape_job_detail(scraper, job_url: str, job_data: dict, companies: dict):
    """Scrape individual job detail page."""
    print(job_url)
    
    try:
        resp = scraper.get(job_url)
        soup = BeautifulSoup(resp.text, "html.parser")
        
        # Job title - try multiple selectors
        job_title = None
        for selector in ["h1.job-title", "h1", ".job-title", "[data-automation='job-title']"]:
            elem = soup.select_one(selector)
            if elem:
                job_title = safe_text(elem)
                if job_title != "N/A":
                    break
        
        if not job_title or job_title == "N/A":
            job_title = job_data.get("title", "Unknown Job")
        
        # Company name - try multiple selectors
        company_name = None
        for selector in [".company-name", ".employer-name", "[data-automation='company-name']", ".company a"]:
            elem = soup.select_one(selector)
            if elem:
                company_name = safe_text(elem)
                if company_name != "N/A":
                    break
        
        if not company_name or company_name == "N/A":
            company_name = job_data.get("company", "Unknown Company")
        
        # Company logo
        logo = None
        logo_elem = soup.select_one(".company-logo img, .employer-logo img, [data-automation='company-logo'] img")
        if logo_elem:
            logo = logo_elem.get("src") or logo_elem.get("data-src")
        
        # Locations
        locations = []
        for selector in [".location", ".job-location", "[data-automation='job-location']", ".address"]:
            loc_elem = soup.select_one(selector)
            if loc_elem:
                loc_text = safe_text(loc_elem)
                if loc_text != "N/A":
                    locations = [l.strip() for l in loc_text.split(",") if l.strip()]
                    break
        
        if not locations:
            locations = job_data.get("locations", [])
        
        # Salary
        salary_min, salary_max = 0, 0
        for selector in [".salary", ".salary-range", "[data-automation='salary']", ".job-salary"]:
            salary_elem = soup.select_one(selector)
            if salary_elem:
                salary_text = safe_text(salary_elem)
                if salary_text != "N/A" and "thỏa thuận" not in salary_text.lower():
                    salary_min, salary_max = extract_salary(salary_text)
                    break
        
        # Experience
        experience_min = None
        for selector in [".experience", "[data-automation='experience']", ".job-experience"]:
            exp_elem = soup.select_one(selector)
            if exp_elem:
                exp_text = safe_text(exp_elem)
                if exp_text != "N/A":
                    experience_min = extract_experience_years(exp_text)
                    break
        
        # Skills - look for skill tags or requirements section
        skills = []
        skill_container = soup.select_one(".skills, .job-skills, [data-automation='skills']")
        if skill_container:
            for skill_elem in skill_container.select("span, a, li"):
                skill_text = safe_text(skill_elem)
                if (skill_text and 
                    skill_text != "N/A" and 
                    len(skill_text) > 1 and 
                    len(skill_text) < 50 and
                    not is_likely_province(skill_text)):
                    skills.append(skill_text)
        
        # Also try to extract skills from requirements section
        req_section = soup.find(["h2", "h3", "h4"], string=lambda t: t and ("kỹ năng" in t.lower() or "yêu cầu" in t.lower() or "skill" in t.lower()))
        if req_section:
            sibling = req_section.find_next_sibling()
            if sibling:
                for item in sibling.select("li, span, a"):
                    skill_text = safe_text(item)
                    if (skill_text and 
                        skill_text != "N/A" and 
                        len(skill_text) > 1 and 
                        len(skill_text) < 50 and
                        skill_text not in skills and
                        not is_likely_province(skill_text)):
                        skills.append(skill_text)
        
        # Description
        description_parts = []
        desc_container = soup.select_one(".job-description, .description, [data-automation='job-description']")
        if desc_container:
            # Try to find sections with headers
            headers = desc_container.select("h2, h3, h4, strong")
            for header in headers:
                title = safe_text(header)
                body_elem = header.find_next_sibling()
                body = safe_text(body_elem) if body_elem else ""
                if title != "N/A":
                    description_parts.append({"title": title, "body": body})
            
            # If no headers found, get the whole text
            if not description_parts:
                full_text = safe_text(desc_container)
                if full_text != "N/A":
                    description_parts.append({"title": "", "body": full_text})
        
        # Company page info (if available)
        company_desc = ""
        company_website = None
        employees_min, employees_max = None, None
        comp_addr = []
        
        company_link = soup.select_one(".company-name a, .employer-name a, [data-automation='company-link']")
        if company_link and company_link.get("href"):
            try:
                comp_url = urljoin("https://www.vietnamworks.com", company_link.get("href"))
                human_delay(1, 2)
                comp_resp = scraper.get(comp_url)
                comp_soup = BeautifulSoup(comp_resp.text, "html.parser")
                
                # Company description
                desc_elem = comp_soup.select_one(".company-description, .about-company, [data-automation='company-about']")
                if desc_elem:
                    company_desc = safe_text(desc_elem)
                
                # Company website
                web_elem = comp_soup.select_one("a[href*='http']:not([href*='vietnamworks'])")
                if web_elem:
                    company_website = web_elem.get("href")
                
                # Company address
                addr_elem = comp_soup.select_one(".company-address, .address")
                if addr_elem:
                    comp_addr = [safe_text(addr_elem)]
                    
            except Exception as e:
                print(f"Could not fetch company info: {e}")
        
        # Build company data
        if company_name not in companies:
            companies[company_name] = {
                "logo": logo,
                "address": comp_addr,
                "description": company_desc,
                "employees_min": employees_min,
                "employees_max": employees_max,
                "website_url": company_website,
                "crawled_at": datetime.now(),
                "source": "vietnamworks",
                "jobs": {},
            }
        
        # Build job data
        companies[company_name]["jobs"][job_title] = {
            "description": description_parts,
            "locations": locations,
            "job_url": job_url,
            "date_posted": job_data.get("date_posted"),
            "skills": skills,
            "experience_min": experience_min,
            "crawled_at": datetime.now(timezone.utc),
            "salary_min": salary_min if salary_min else None,
            "salary_max": salary_max if salary_max else None,
            "source": "vietnamworks",
        }
        
    except Exception as e:
        print(f"⚠️ Error scraping job detail {job_url}: {e}")


def scrape_page(scraper, page_num, headers):
    """Scrape a single listing page."""
    base_url = "https://www.vietnamworks.com"
    # g=5 is IT/Software category
    listing_url = f"{base_url}/viec-lam?g=5&ignoreLocation=true&page={page_num}"
    
    print(f"--- Scraping VietnamWorks listing page {page_num} ---")
    
    html = fetch_page(scraper, listing_url, headers=headers)
    if not html:
        print(f"Failed to fetch listing page {page_num}")
        return {}
    
    soup = BeautifulSoup(html, "html.parser")
    companies = {}
    
    # Try multiple selectors for job cards
    job_cards = []
    for selector in [
        ".job-item",
        ".job-card", 
        "[data-automation='job-item']",
        ".search-result-item",
        "article.job",
        ".job-list-item"
    ]:
        job_cards = soup.select(selector)
        if job_cards:
            print(f"Found {len(job_cards)} jobs using selector: {selector}")
            break
    
    if not job_cards:
        # Fallback: look for links that look like job links
        job_links = soup.select("a[href*='/job/'], a[href*='/viec-lam/']")
        print(f"Fallback: Found {len(job_links)} job links")
        
        for link in job_links[:20]:  # Limit to avoid duplicates
            job_url = urljoin(base_url, link.get("href"))
            job_data = {
                "title": safe_text(link),
                "company": "Unknown",
                "locations": [],
                "date_posted": None,
            }
            scrape_job_detail(scraper, job_url, job_data, companies)
            human_delay(2, 3)
        
        return companies
    
    # Process job cards
    for card in job_cards:
        try:
            # Get job link
            job_link = card.select_one("a.job-title, a[data-automation='job-title'], h3 a, h2 a, a")
            if not job_link or not job_link.get("href"):
                continue
            
            job_url = urljoin(base_url, job_link.get("href"))
            
            # Skip if not a job page
            if "/job/" not in job_url and "/viec-lam/" not in job_url:
                continue
            
            # Extract preview data from card
            job_data = {
                "title": safe_text(job_link),
                "company": safe_text(card.select_one(".company-name, .employer-name")),
                "locations": [],
                "date_posted": None,
            }
            
            # Location from card
            loc_elem = card.select_one(".location, .job-location")
            if loc_elem:
                loc_text = safe_text(loc_elem)
                if loc_text != "N/A":
                    job_data["locations"] = [l.strip() for l in loc_text.split(",")]
            
            # Date posted from card
            date_elem = card.select_one(".date-posted, .posted-date, .job-post-date")
            if date_elem:
                try:
                    date_text = safe_text(date_elem)
                    if date_text != "N/A":
                        job_data["date_posted"] = vn_parse_posted_date(date_text)
                except:
                    pass
            
            # Scrape detail page
            scrape_job_detail(scraper, job_url, job_data, companies)
            human_delay(2, 3)
            
        except Exception as e:
            print(f"⚠️ Error processing job card: {e}")
            continue
    
    return companies


def vietnamworks_crawl(pages: int = 1, start_page: int = 1):
    """
    Crawl VietnamWorks IT job listings.
    
    Args:
        pages: Number of listing pages to crawl
        start_page: Starting page number
        
    Returns:
        Dictionary of companies and their jobs
    """
    print(f"[VietnamWorks] Crawling IT jobs (page {start_page})")
    return crawl(scrape_page, delay=2, jitter=3, pages=pages, start_page=start_page)
