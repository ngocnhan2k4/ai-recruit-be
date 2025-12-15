"""
Data extraction utilities for the job crawler.

This module contains functions for extracting structured data from
text strings, such as salary ranges, employee counts, and experience years.
"""

import math
import re
from typing import Optional, Tuple


def extract_salary(salary: str) -> Tuple[int, int]:
    """
    Extract salary range from a Vietnamese salary string.
    
    Handles formats like:
    - "10 - 20 triệu" (10-20 million VND)
    - "1000 - 2000 USD"
    - "Thoả thuận" (Negotiable)
    - "Tới 30 triệu" (Up to 30 million)
    
    Args:
        salary: Salary string to parse
        
    Returns:
        Tuple of (min_salary, max_salary) in millions VND.
        Returns (0, 0) for negotiable salaries or unparseable strings.
        
    Example:
        >>> extract_salary("15 - 25 triệu")
        (15, 25)
    """
    s = salary.replace(",", "").lower().strip()
    USD_CONVERSION_FACTOR = 25.0  # Approximate VND/USD rate in thousands

    if "thoả thuận" in s:
        return 0, 0

    if s.startswith("tới"):
        match = re.search(r"(\d+)\s*(triệu|usd)", s)
        if match:
            value = float(match.group(1))
            unit = match.group(2)

            max_salary = value
            if unit == "usd":
                max_salary = value * USD_CONVERSION_FACTOR / 1000

            return 0, int(round(max_salary))

    if "-" in s:
        parts = s.split("-")

        min_match = re.search(r"(\d+)", parts[0])
        max_match = re.search(r"(\d+)\s*(triệu|usd)", parts[1])

        if min_match and max_match:
            min_value = float(min_match.group(1))
            max_value = float(max_match.group(1))
            unit = max_match.group(2)

            if unit == "triệu":
                min_salary = min_value
                max_salary = max_value
            elif unit == "usd":
                min_salary = min_value * USD_CONVERSION_FACTOR / 1000
                max_salary = max_value * USD_CONVERSION_FACTOR / 1000
            else:
                return 0, 0

            return int(round(min_salary)), int(round(max_salary))

    return 0, 0


def extract_employees(company_size: str) -> Tuple[Optional[int], Optional[int]]:
    """
    Extract employee count range from a simple size string.
    
    Handles formats like "100-500" or "1000+".
    
    Args:
        company_size: Size string to parse
        
    Returns:
        Tuple of (min_employees, max_employees).
        max_employees is None for "X+" format.
    """
    if not company_size:
        return None, None
        
    if "-" in company_size:
        fields = company_size.split("-")
        try:
            return int(fields[0].strip()), int(fields[1].strip())
        except (ValueError, IndexError):
            return None, None
    elif "+" in company_size:
        fields = company_size.split("+")
        try:
            return int(fields[0].strip()), None
        except (ValueError, IndexError):
            return None, None
    
    return None, None


def extract_employee_range(text: str) -> Tuple[Optional[int], Optional[int]]:
    """
    Extract employee count range from various text formats.
    
    More robust than extract_employees, handles formats like:
    - "100-500 employees"
    - "1,000 - 5,000"
    - "10.000 nhân viên"
    
    Args:
        text: Text containing employee count
        
    Returns:
        Tuple of (min_employees, max_employees)
    """
    if not isinstance(text, str):
        return (None, None)

    number_strings = re.findall(r"[\d,.]+", text)

    numbers = []
    for s in number_strings:
        try:
            # Handle both comma and dot as thousand separators
            cleaned_num = int(s.replace(".", "").replace(",", ""))
            numbers.append(cleaned_num)
        except ValueError:
            continue

    if len(numbers) >= 2:
        return (numbers[0], numbers[1])
    elif len(numbers) == 1:
        return (numbers[0], None)
    else:
        return (None, None)


def extract_experience_years(experience_str: str) -> int:
    """
    Extract years of experience from a Vietnamese experience string.
    
    Handles formats like:
    - "2 năm kinh nghiệm"
    - "Không yêu cầu" (No requirement)
    
    Args:
        experience_str: Experience requirement string
        
    Returns:
        Number of years required, 0 if not specified or not required
    """
    s = experience_str.lower().strip()

    if "không yêu cầu" in s:
        return 0

    match = re.search(r"(\d+)\s*năm", s)

    if match:
        value = int(match.group(1))
        return value

    return 0


def extract_experience_years_jobsgo(
    experience_str: str
) -> Tuple[Optional[int], Optional[int]]:
    """
    Extract experience years range from JobsGO format strings.
    
    Handles formats like:
    - "Dưới 1 năm" (Under 1 year)
    - "Trên 5 năm" (Over 5 years)
    - "2 - 5 năm" (2-5 years)
    - "Không yêu cầu" (No requirement)
    
    Args:
        experience_str: JobsGO experience string
        
    Returns:
        Tuple of (min_years, max_years). None values indicate no bound.
    """
    s = experience_str.lower().replace("năm", "").strip()

    if "không yêu cầu" in s:
        return 0, None

    if "dưới" in s:
        try:
            max_val = math.ceil(float(s.replace("dưới", "").strip()))
            return None, max_val
        except ValueError:
            return None, None
    elif "trên" in s:
        try:
            min_val = math.ceil(float(s.replace("trên", "").strip()))
            return min_val, None
        except ValueError:
            return None, None
    elif "-" in s:
        try:
            min_val, max_val = s.split("-")
            min_val = math.ceil(float(min_val.strip()))
            max_val = math.ceil(float(max_val.strip()))
            return min_val, max_val
        except ValueError:
            return None, None
    else:
        # Single number
        try:
            val = math.ceil(float(s))
            return val, val
        except ValueError:
            return None, None
