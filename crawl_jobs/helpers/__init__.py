# Text utilities
from helpers.text import (
    safe_text,
    slugify,
    normalize_text,
    html_to_mixed_content,
)

# Date utilities
from helpers.date import (
    parse_posted_date,
    vn_parse_posted_date,
    get_date_posted,
    vietnam_time_now,
)

# Data extraction utilities
from helpers.extraction import (
    extract_salary,
    extract_employees,
    extract_employee_range,
    extract_experience_years,
    extract_experience_years_jobsgo,
)

# Province utilities
from helpers.province import (
    VIETNAM_PROVINCES,
    is_likely_province,
    process_province,
    normalize_province_name,
    get_standard_province_name,
)

# HTTP utilities
from helpers.http import (
    USER_AGENTS,
    get_headers,
    human_delay,
    fetch_page,
    create_scraper,
    crawl,
)

# Security utilities
from helpers.security import (
    is_safe_db_url,
    DISALLOWED_SCHEMES,
    BLACKLISTED_NETWORKS,
)

# Skill utilities
from helpers.skills import (
    COMMON_TECH_SKILLS,
    extract_skills_from_text,
)


__all__ = [
    # Text
    "safe_text", "slugify", "normalize_text", "html_to_mixed_content",
    # Date
    "parse_posted_date", "vn_parse_posted_date", "get_date_posted", "vietnam_time_now",
    # Extraction
    "extract_salary", "extract_employees", "extract_employee_range",
    "extract_experience_years", "extract_experience_years_jobsgo",
    # Province
    "VIETNAM_PROVINCES", "is_likely_province", "process_province",
    "normalize_province_name", "get_standard_province_name",
    # HTTP
    "USER_AGENTS", "get_headers", "human_delay", "fetch_page", "create_scraper", "crawl",
    # Security
    "is_safe_db_url", "DISALLOWED_SCHEMES", "BLACKLISTED_NETWORKS",
    # Skills
    "COMMON_TECH_SKILLS", "extract_skills_from_text",
]
