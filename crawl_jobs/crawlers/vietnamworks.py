"""
VietnamWorks job crawler.

Crawls IT job listings from https://www.vietnamworks.com
Query parameter g=5 is for IT/Software jobs.

Note: VietnamWorks uses dynamically generated CSS class names (React/styled-components),
so we rely on structural selectors and tag-based patterns rather than specific class names.
"""

import json
import re
from datetime import datetime, timezone
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from helpers.extraction import extract_experience_years, extract_salary
from helpers.http import crawl, fetch_page, human_delay
from helpers.province import is_likely_province
from helpers.text import html_to_mixed_content, safe_text


def _parse_nextjs_payload(html_content: str) -> dict:
    """Extract and resolve Next.js RSC stream payload from HTML content."""
    chunks = []
    idx = 0
    while True:
        pos = html_content.find("self.__next_f.push", idx)
        if pos == -1:
            break
        
        array_start = html_content.find("[", pos)
        if array_start == -1:
            idx = pos + 1
            continue
            
        comma_pos = html_content.find(",", array_start)
        if comma_pos == -1:
            idx = pos + 1
            continue
            
        quote_char = None
        quote_pos = -1
        for i in range(comma_pos + 1, len(html_content)):
            if html_content[i] in ("'", '"', '`'):
                quote_char = html_content[i]
                quote_pos = i
                break
                
        if quote_pos == -1:
            idx = pos + 1
            continue
            
        val_chars = []
        i = quote_pos + 1
        n = len(html_content)
        while i < n:
            c = html_content[i]
            if c == '\\':
                if i + 1 >= n:
                    break
                next_c = html_content[i+1]
                if next_c == 'n':
                    val_chars.append('\n')
                    i += 2
                elif next_c == 't':
                    val_chars.append('\t')
                    i += 2
                elif next_c == 'r':
                    val_chars.append('\r')
                    i += 2
                elif next_c == 'f':
                    val_chars.append('\f')
                    i += 2
                elif next_c == 'b':
                    val_chars.append('\b')
                    i += 2
                elif next_c == 'u':
                    hex_str = html_content[i+2:i+6]
                    try:
                        val_chars.append(chr(int(hex_str, 16)))
                        i += 6
                    except:
                        val_chars.append('\\u')
                        i += 2
                else:
                    val_chars.append(next_c)
                    i += 2
            elif c == quote_char:
                break
            else:
                val_chars.append(c)
                i += 1
        
        chunks.append("".join(val_chars))
        idx = i + 1

    full_stream = "".join(chunks)
    if not full_stream:
        return {}

    defs = {}
    pattern = re.compile(r'\b([0-9a-fA-F]+):(T[0-9a-fA-F]+,|\{|\[|I|M|E|b)')
    matches = list(pattern.finditer(full_stream))
    
    for idx, match in enumerate(matches):
        key = match.group(1)
        prefix = match.group(2)
        val_start = match.end()
        
        if idx + 1 < len(matches):
            val_end = matches[idx+1].start()
        else:
            val_end = len(full_stream)
            
        val_str = full_stream[val_start:val_end].strip()
        defs[key] = (prefix + val_str).strip()

    def resolve(val, defs_dict, visited=None):
        if visited is None:
            visited = set()
            
        if isinstance(val, str):
            if val.startswith("$") and val[1:] in defs_dict:
                ref_key = val[1:]
                if ref_key in visited:
                    return None
                visited.add(ref_key)
                ref_val_str = defs_dict[ref_key]
                resolved_ref = parse_value(ref_val_str, ref_key, defs_dict, visited)
                visited.remove(ref_key)
                return resolved_ref
            return val
        elif isinstance(val, list):
            return [resolve(item, defs_dict, visited) for item in val]
        elif isinstance(val, dict):
            return {k: resolve(v, defs_dict, visited) for k, v in val.items()}
        return val

    def parse_value(val_str, key, defs_dict, visited):
        if val_str.startswith('T'):
            comma_idx = val_str.find(',')
            if comma_idx != -1:
                return val_str[comma_idx+1:]
            return val_str
        if val_str.startswith('{') or val_str.startswith('['):
            try:
                parsed_json = json.loads(val_str.strip())
                return resolve(parsed_json, defs_dict, visited)
            except:
                return val_str
        return val_str

    job_key = None
    for k, v in defs.items():
        if '"jobId"' in v:
            job_key = k
            break
            
    if job_key:
        try:
            job_data = json.loads(defs[job_key].strip())
            return resolve(job_data, defs)
        except:
            pass
            
    return {}


def scrape_job_detail(scraper, job_url: str, job_data: dict, companies: dict):
    """Scrape individual job detail page."""
    print(f"  📄 {job_url}")

    try:
        resp = scraper.get(job_url)
        resolved_job = _parse_nextjs_payload(resp.text)
        
        if resolved_job:
            # Job title
            job_title = resolved_job.get("jobTitle") or job_data.get("title") or "Unknown Job"
            
            # Company name
            company_name = resolved_job.get("companyName") or job_data.get("company")
            if not company_name:
                company_name = resolved_job.get("companyInfo", {}).get("companyName") or "Unknown Company"
                
            # Company logo
            logo = resolved_job.get("companyLogo") or resolved_job.get("companyInfo", {}).get("companyLogoURL")
            
            # Locations
            locations = []
            working_locs = resolved_job.get("workingLocations") or []
            if isinstance(working_locs, list):
                for loc in working_locs:
                    if isinstance(loc, dict):
                        city = loc.get("cityNameVI") or loc.get("cityName")
                        if city and city not in locations:
                            locations.append(city)
            if not locations:
                locations = job_data.get("locations", [])
                
            # Salary
            salary_min = resolved_job.get("salaryMin", 0)
            salary_max = resolved_job.get("salaryMax", 0)
            salary_currency = (resolved_job.get("salaryCurrency") or "VND").upper()
            pretty_salary = resolved_job.get("prettySalary") or resolved_job.get("prettySalaryVI") or ""
            if (salary_min == 0 and salary_max == 0) and pretty_salary:
                if "thương lượng" not in pretty_salary.lower() and "negotiable" not in pretty_salary.lower():
                    salary_min, salary_max = extract_salary(pretty_salary)
            else:
                # Convert raw values to million VND standard (as done in extract_salary)
                USD_CONVERSION_FACTOR = 25.0  # Approx rate in thousands (25,000 VND / USD)
                if salary_currency == "VND":
                    # Convert raw VND (e.g. 20000000) to million VND (e.g. 20)
                    salary_min = round(salary_min / 1_000_000)
                    salary_max = round(salary_max / 1_000_000)
                elif salary_currency == "USD":
                    # Convert raw USD (e.g. 2000) to million VND (e.g. 50)
                    salary_min = round(salary_min * USD_CONVERSION_FACTOR / 1000)
                    salary_max = round(salary_max * USD_CONVERSION_FACTOR / 1000)
                    
            # Experience
            experience_min = resolved_job.get("yearsOfExperience")
            if experience_min is not None:
                try:
                    experience_min = int(experience_min)
                except:
                    experience_min = None
                    
            # Skills
            skills = []
            job_skills = resolved_job.get("skills") or []
            if isinstance(job_skills, list):
                for s in job_skills:
                    if isinstance(s, dict) and s.get("skillName"):
                        skills.append(s.get("skillName"))
            
            # Description
            desc_html = ""
            desc_text = resolved_job.get("jobDescription")
            req_text = resolved_job.get("jobRequirement")
            if desc_text:
                desc_html += f"<h2>Mô tả công việc</h2>\n{desc_text}\n"
            if req_text:
                desc_html += f"<h2>Yêu cầu công việc</h2>\n{req_text}\n"
            description = html_to_mixed_content(desc_html)
        else:
            # Fallback to the original BeautifulSoup parsing
            soup = BeautifulSoup(resp.text, "html.parser")
            
            # Job title
            title_elem = soup.select_one("h1")
            job_title = safe_text(title_elem, normalize_camel_case=False) if title_elem else None
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

            # Skills
            skills = _extract_skills_from_sections(soup, locations)

            # Description
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
    job_links_dict = {}
    for link in soup.select("a[href*='-jv']"):
        href = link.get("href", "")
        if "-jv" in href:
            if "/viec-lam?" in href or "/tim-viec-lam" in href:
                continue
            # Normalize URL to group by base URL (removing query parameters)
            base_href = href.split("?")[0]
            
            text = safe_text(link)
            if base_href not in job_links_dict:
                job_links_dict[base_href] = {
                    "link": link,
                    "text": text,
                    "href": href
                }
            else:
                # If existing is empty/N/A and new has text, update it!
                if (not job_links_dict[base_href]["text"] or job_links_dict[base_href]["text"] == "N/A") and text and text != "N/A":
                    job_links_dict[base_href]["link"] = link
                    job_links_dict[base_href]["text"] = text
                    job_links_dict[base_href]["href"] = href

    unique_jobs = list(job_links_dict.values())
    print(f"Found {len(unique_jobs)} unique job links")

    if not unique_jobs:
        # Fallback: look for any job-like links
        fallback_dict = {}
        for link in soup.select("a[href]"):
            href = link.get("href", "")
            if any(kw in href for kw in ["/job/", "/viec-lam/", "/tuyen-dung/"]):
                base_href = href.split("?")[0]
                text = safe_text(link)
                if base_href not in fallback_dict:
                    fallback_dict[base_href] = {
                        "link": link,
                        "text": text,
                        "href": href
                    }
                else:
                    if (not fallback_dict[base_href]["text"] or fallback_dict[base_href]["text"] == "N/A") and text and text != "N/A":
                        fallback_dict[base_href]["link"] = link
                        fallback_dict[base_href]["text"] = text
                        fallback_dict[base_href]["href"] = href
        unique_jobs = list(fallback_dict.values())
        print(f"Fallback: found {len(unique_jobs)} potential job links")

    for idx, job_info in enumerate(unique_jobs[:15]):
        try:
            href = job_info["href"]
            job_url = urljoin(base_url, href)

            job_data = {
                "title": job_info["text"],
                "company": "",
                "locations": [],
                "date_posted": None,
            }

            job_link = job_info["link"]
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