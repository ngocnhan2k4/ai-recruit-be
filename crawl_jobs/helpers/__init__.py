# Text utilities
# Date utilities
from helpers.date import (
    get_date_posted,
    parse_posted_date,
    vietnam_time_now,
    vn_parse_posted_date,
)

# Data extraction utilities
from helpers.extraction import (
    extract_employee_range,
    extract_employees,
    extract_experience_years,
    extract_experience_years_jobsgo,
    extract_salary,
)

# HTTP utilities
from helpers.http import (
    USER_AGENTS,
    crawl,
    create_scraper,
    fetch_page,
    get_headers,
    human_delay,
)

# Province utilities
from helpers.province import (
    VIETNAM_PROVINCES,
    get_standard_province_name,
    is_likely_province,
    normalize_province_name,
    process_province,
)

# Security utilities
from helpers.security import (
    BLACKLISTED_NETWORKS,
    DISALLOWED_SCHEMES,
    is_safe_db_url,
)
from helpers.text import (
    html_to_mixed_content,
    normalize_text,
    safe_text,
    slugify,
)

__all__ = [
    # Text
    "safe_text",
    "slugify",
    "normalize_text",
    "html_to_mixed_content",
    # Date
    "parse_posted_date",
    "vn_parse_posted_date",
    "get_date_posted",
    "vietnam_time_now",
    # Extraction
    "extract_salary",
    "extract_employees",
    "extract_employee_range",
    "extract_experience_years",
    "extract_experience_years_jobsgo",
    # Province
    "VIETNAM_PROVINCES",
    "is_likely_province",
    "process_province",
    "normalize_province_name",
    "get_standard_province_name",
    # HTTP
    "USER_AGENTS",
    "get_headers",
    "human_delay",
    "fetch_page",
    "create_scraper",
    "crawl",
    # Security
    "is_safe_db_url",
    "DISALLOWED_SCHEMES",
    "BLACKLISTED_NETWORKS",
]
