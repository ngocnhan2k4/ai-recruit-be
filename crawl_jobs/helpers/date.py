"""
Date parsing utilities for the job crawler.

This module contains functions for parsing relative date strings
(e.g., "2 days ago", "3 giờ trước") into datetime objects.
"""

import re
from datetime import datetime, timedelta, timezone
from typing import Optional

from helpers.text import safe_text


def parse_posted_date(text: str) -> datetime:
    """
    Parse an English relative date string into a datetime object.
    
    Handles formats like "2 days ago", "1 hour ago", "3 weeks ago", etc.
    
    Args:
        text: Relative date string in English
        
    Returns:
        datetime object representing the parsed date
        
    Raises:
        ValueError: If the date string format is not recognized
        
    Example:
        >>> parse_posted_date("2 days ago")
        datetime(2024, 12, 13, ...)  # 2 days before now
    """
    clean = re.sub(r"\s+", " ", text).strip()

    m = re.search(r"(\d+)\s*(minute|hour|day|week|month)", clean, re.IGNORECASE)
    if not m:
        raise ValueError(f"Unrecognized date string: {text!r}")

    value = int(m.group(1))
    unit = m.group(2).lower()

    now = datetime.now()
    if unit.startswith("minute"):
        return now - timedelta(minutes=value)
    elif unit.startswith("hour"):
        return now - timedelta(hours=value)
    elif unit.startswith("day"):
        return now - timedelta(days=value)
    elif unit.startswith("week"):
        return now - timedelta(weeks=value)
    elif unit.startswith("month"):
        return now - timedelta(days=value * 30)
    else:
        raise ValueError(f"Unknown unit in date string: {text!r}")


def vn_parse_posted_date(text: str) -> datetime:
    """
    Parse a Vietnamese relative date string into a datetime object.
    
    Handles formats like "2 ngày trước", "1 giờ trước", "5 phút trước", etc.
    
    Args:
        text: Relative date string in Vietnamese
        
    Returns:
        datetime object representing the parsed date
        
    Raises:
        ValueError: If the date string format is not recognized
        
    Example:
        >>> vn_parse_posted_date("2 ngày trước")
        datetime(2024, 12, 13, ...)  # 2 days before now
    """
    clean = re.sub(r"\s+", " ", text).strip().lower()

    m = re.search(r"(\d+)\s*(giây|phút|giờ|ngày)", clean)

    if not m:
        raise ValueError(f"Unrecognized date string: {text!r}")

    value = int(m.group(1))
    unit = m.group(2)

    now = datetime.now()

    if unit == "giây":
        return now - timedelta(seconds=value)
    if unit == "phút":
        return now - timedelta(minutes=value)
    elif unit == "giờ":
        return now - timedelta(hours=value)
    elif unit == "ngày":
        return now - timedelta(days=value)
    else:
        raise ValueError(f"Unknown unit in date string: {text!r}")


def get_date_posted(loc_span) -> Optional[str]:
    """
    Extract date posted text from a list of span elements.
    
    Searches for a span containing a date pattern like "X days ago".
    
    Args:
        loc_span: List of BeautifulSoup span elements
        
    Returns:
        Date string if found, None otherwise
    """
    for idx, span in enumerate(loc_span):
        if idx < 2:
            continue
        text = safe_text(span)
        if re.search(r"\d", text) and re.search(r"\bago\b", text, re.IGNORECASE):
            return text
    return None


def vietnam_time_now() -> str:
    """
    Get the current time in Vietnam timezone (UTC+7).
    
    Returns:
        Formatted datetime string in "YYYY-MM-DD HH:MM:SS" format
    """
    vn_tz = timezone(timedelta(hours=7))
    return datetime.now(vn_tz).strftime("%Y-%m-%d %H:%M:%S")
