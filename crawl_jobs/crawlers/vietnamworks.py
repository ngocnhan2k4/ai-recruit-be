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

from helpers.http import crawl, fetch_page, human_delay
from helpers.extraction import extract_salary, extract_experience_years
from helpers.text import safe_text
from helpers.date import vn_parse_posted_date
from helpers.province import is_likely_province


def scrape_job_detail(scraper, job_url: str, job_data: dict, companies: dict):
    """Scrape individual job detail page."""
    print(f"  📄 {job_url}")
    
    try:
        resp = scraper.get(job_url)
        soup = BeautifulSoup(resp.text, "html.parser")
        
        # Job title - h1 is the main title on detail page
        job_title = None
        title_elem = soup.select_one("h1")
        if title_elem:
            job_title = safe_text(title_elem)
        
        if not job_title or job_title == "N/A":
            job_title = job_data.get("title", "Unknown Job")
        
        # Company name - usually in a link near the top
        company_name = None
        # Look for links that might be company links (exclude job-related links)
        company_links = soup.select("a[href*='/nha-tuyen-dung/'], a[href*='/employer/'], a[href*='/company/']")
        if company_links:
            company_name = safe_text(company_links[0])
        
        if not company_name or company_name == "N/A":
            # Fallback: look for text near company logo or header area
            header_section = soup.select_one("header, .header, [class*='header'], [class*='company']")
            if header_section:
                links = header_section.select("a")
                for link in links:
                    text = safe_text(link)
                    if text and text != "N/A" and len(text) > 2 and len(text) < 100:
                        company_name = text
                        break
        
        if not company_name or company_name == "N/A":
            company_name = job_data.get("company", "Unknown Company")
        
        # Company logo - look for img tags with logo-like src
        logo = None
        logo_candidates = soup.select("img[src*='logo'], img[src*='company'], img[alt*='logo']")
        if logo_candidates:
            logo = logo_candidates[0].get("src") or logo_candidates[0].get("data-src")
        else:
            # Fallback: first image in header/company area
            header = soup.select_one("header, [class*='header'], [class*='company-info']")
            if header:
                img = header.select_one("img")
                if img:
                    logo = img.get("src") or img.get("data-src")
        
        # Locations - look for text containing Vietnamese city names
        locations = job_data.get("locations", [])
        if not locations:
            # Try to find location elements
            loc_candidates = soup.find_all(string=lambda t: t and any(city in t for city in ["Hà Nội", "Hồ Chí Minh", "Đà Nẵng", "Cần Thơ", "Hải Phòng"]))
            for loc in loc_candidates[:2]:
                loc_text = str(loc).strip()
                if len(loc_text) < 50:  # Avoid long text blocks
                    locations.append(loc_text)
        
        # Salary - look for "Thương lượng" or salary patterns
        salary_min, salary_max = 0, 0
        salary_text = None
        
        # Look for salary keywords
        salary_candidates = soup.find_all(string=lambda t: t and ("triệu" in t.lower() or "usd" in t.lower() or "thương lượng" in t.lower() or "lương" in t.lower()))
        for candidate in salary_candidates:
            text = str(candidate).strip()
            if len(text) < 100:  # Avoid long text blocks
                salary_text = text
                break
        
        if salary_text and "thương lượng" not in salary_text.lower():
            salary_min, salary_max = extract_salary(salary_text)
        
        # Experience - look for "năm kinh nghiệm" patterns
        experience_min = None
        exp_candidates = soup.find_all(string=lambda t: t and "năm" in t.lower() and ("kinh nghiệm" in t.lower() or "experience" in t.lower()))
        for candidate in exp_candidates:
            text = str(candidate).strip()
            if len(text) < 100:
                experience_min = extract_experience_years(text)
                if experience_min:
                    break
        
        # Skills - look for list items in requirements section
        skills = []
        
        # Find "Yêu cầu công việc" or similar sections
        req_headers = soup.find_all(["h2", "h3", "h4", "strong", "b"], 
                                     string=lambda t: t and ("yêu cầu" in t.lower() or "kỹ năng" in t.lower() or "skill" in t.lower()))
        
        for header in req_headers:
            # Get the next sibling elements (usually ul/ol with li items)
            sibling = header.find_next_sibling()
            if sibling:
                items = sibling.select("li")
                for item in items[:10]:  # Limit to avoid too many
                    skill_text = safe_text(item)
                    # Extract first part before comma or colon if too long
                    if len(skill_text) > 50:
                        parts = skill_text.split(",")
                        skill_text = parts[0].strip() if parts else skill_text[:50]
                    
                    if (skill_text and 
                        skill_text != "N/A" and 
                        len(skill_text) > 1 and 
                        len(skill_text) < 80 and
                        not is_likely_province(skill_text)):
                        skills.append(skill_text)
        
        # Also try to extract common tech skills from description
        desc_text = safe_text(soup.select_one("body"))
        common_skills = [
            "Python", "JavaScript", "Java", "C++", "C#", "TypeScript", "Go", "Rust",
            "React", "Angular", "Vue", "Node.js", "Django", "Flask", "Spring",
            "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Git", "CI/CD",
            "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch",
            ".NET", "PHP", "Ruby", "Swift", "Kotlin", "Scala",
            "Linux", "DevOps", "Agile", "Scrum",
        ]
        for skill in common_skills:
            if skill.lower() in desc_text.lower() and skill not in skills:
                skills.append(skill)
        
        # Description - find "Mô tả công việc" section
        description_parts = []
        desc_headers = soup.find_all(["h2", "h3", "h4", "strong", "b"],
                                      string=lambda t: t and ("mô tả" in t.lower() or "description" in t.lower()))
        
        for header in desc_headers:
            title = safe_text(header)
            sibling = header.find_next_sibling()
            if sibling:
                body = safe_text(sibling, sep="\n")
                if body != "N/A":
                    description_parts.append({"title": title, "body": body})
        
        # Fallback: get main content area
        if not description_parts:
            main_content = soup.select_one("main, article, [class*='content'], [class*='description']")
            if main_content:
                full_text = safe_text(main_content, sep="\n")
                if full_text != "N/A" and len(full_text) > 100:
                    description_parts.append({"title": "", "body": full_text[:2000]})  # Limit length
        
        # Company info
        company_desc = ""
        company_website = None
        employees_min, employees_max = None, None
        comp_addr = []
        
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
        
        # Update logo if we found one and company doesn't have it
        if logo and not companies[company_name].get("logo"):
            companies[company_name]["logo"] = logo
        
        # Build job data
        companies[company_name]["jobs"][job_title] = {
            "description": description_parts,
            "locations": locations,
            "job_url": job_url,
            "date_posted": job_data.get("date_posted"),
            "skills": skills[:15],  # Limit skills
            "experience_min": experience_min,
            "crawled_at": datetime.now(timezone.utc),
            "salary_min": salary_min if salary_min else None,
            "salary_max": salary_max if salary_max else None,
            "source": "vietnamworks",
        }
        
        print(f"    ✓ {job_title} @ {company_name} ({len(skills)} skills)")
        
    except Exception as e:
        print(f"    ⚠️ Error: {e}")


def scrape_page(scraper, page_num, headers):
    """Scrape a single listing page."""
    base_url = "https://www.vietnamworks.com"
    # g=5 is IT/Software category
    listing_url = f"{base_url}/viec-lam?g=5&ignoreLocation=true&page={page_num}"
    
    print(f"\n--- VietnamWorks page {page_num}: {listing_url} ---")
    
    html = fetch_page(scraper, listing_url, headers=headers)
    if not html:
        print(f"Failed to fetch listing page {page_num}")
        return {}
    
    soup = BeautifulSoup(html, "html.parser")
    companies = {}
    
    # VietnamWorks uses dynamic class names, so we look for job links by URL pattern
    # Job URLs contain the job ID pattern like "senior-it-infrastructure--1979484-jv"
    job_links = soup.select("a[href*='-jv']")  # Jobs end with -jv suffix
    
    # Filter to unique job URLs
    seen_urls = set()
    unique_jobs = []
    for link in job_links:
        href = link.get("href", "")
        if "-jv" in href and href not in seen_urls:
            # Skip navigation/filter links
            if "/viec-lam?" in href or "/tim-viec-lam" in href:
                continue
            seen_urls.add(href)
            unique_jobs.append(link)
    
    print(f"Found {len(unique_jobs)} unique job links")
    
    if not unique_jobs:
        # Fallback: look for any links that might be jobs
        all_links = soup.select("a[href]")
        for link in all_links:
            href = link.get("href", "")
            # Check if it looks like a job URL (contains numbers and keywords)
            if any(keyword in href for keyword in ["/job/", "/viec-lam/", "/tuyen-dung/"]):
                if href not in seen_urls:
                    seen_urls.add(href)
                    unique_jobs.append(link)
        
        print(f"Fallback: found {len(unique_jobs)} potential job links")
    
    # Limit to avoid too many requests
    jobs_to_process = unique_jobs[:15]
    
    for idx, job_link in enumerate(jobs_to_process):
        try:
            href = job_link.get("href", "")
            job_url = urljoin(base_url, href)
            
            # Get preview info from link text/context
            job_data = {
                "title": safe_text(job_link),
                "company": "",
                "locations": [],
                "date_posted": None,
            }
            
            # Try to get more context from parent/sibling elements
            parent = job_link.find_parent()
            if parent:
                # Look for company name nearby
                company_elem = parent.find_next_sibling()
                if company_elem:
                    job_data["company"] = safe_text(company_elem)
            
            print(f"\n[{idx+1}/{len(jobs_to_process)}] Processing: {job_data['title'][:50]}...")
            
            # Scrape detail page
            scrape_job_detail(scraper, job_url, job_data, companies)
            human_delay(2, 3)
            
        except Exception as e:
            print(f"⚠️ Error processing job link: {e}")
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
    print(f"\n🔄 [VietnamWorks] Starting IT job crawl (pages {start_page}-{start_page + pages - 1})")
    return crawl(scrape_page, delay=2, jitter=3, pages=pages, start_page=start_page)
