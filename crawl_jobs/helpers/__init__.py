# Text utilities
from helpers.text import (
    safe_text,
    slugify,
    clean_whitespace,
    remove_html_tags,
    normalize_text,
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
    generate_realistic_headers,
    create_browser_config,
)

# Security utilities
from helpers.security import (
    is_safe_db_url,
    sanitize_input,
    is_valid_url,
    DISALLOWED_SCHEMES,
    BLACKLISTED_NETWORKS,
)


# Define __all__ for explicit public API
__all__ = [
    # Text
    "safe_text",
    "slugify",
    "clean_whitespace",
    "remove_html_tags",
    "normalize_text",
    
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
    "generate_realistic_headers",
    "create_browser_config",
    
    # Security
    "is_safe_db_url",
    "sanitize_input",
    "is_valid_url",
    "DISALLOWED_SCHEMES",
    "BLACKLISTED_NETWORKS",
]
