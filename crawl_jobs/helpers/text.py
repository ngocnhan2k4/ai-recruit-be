"""
Text processing utilities for the job crawler.

This module contains functions for text manipulation, cleaning, and transformation.
"""

import re
import unicodedata
from typing import Optional


def safe_text(el, is_strip: bool = True, sep: str = "") -> str:
    """
    Safely extract text from a BeautifulSoup element.
    
    Args:
        el: BeautifulSoup element to extract text from
        is_strip: Whether to strip whitespace from the result
        sep: Separator to use when joining text from child elements
        
    Returns:
        Extracted text or "N/A" if element is None/empty
    """
    if not el:
        return "N/A"
    txt = el.get_text(separator=sep, strip=is_strip)
    return txt if txt else "N/A"


def slugify(text: str) -> str:
    """
    Convert text to a URL-friendly slug.
    
    Removes Vietnamese diacritics and special characters,
    converts to lowercase, and replaces spaces with hyphens.
    
    Args:
        text: Text to slugify
        
    Returns:
        URL-friendly slug string
        
    Example:
        >>> slugify("Công ty ABC")
        "cong-ty-abc"
    """
    # Normalize and remove accents (Vietnamese, etc.)
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def clean_whitespace(text: str) -> str:
    """
    Clean excessive whitespace from text.
    
    Args:
        text: Text to clean
        
    Returns:
        Text with normalized whitespace
    """
    return re.sub(r"\s+", " ", text).strip()


def remove_html_tags(text: str) -> str:
    """
    Remove HTML tags from text.
    
    Args:
        text: Text potentially containing HTML
        
    Returns:
        Plain text with HTML tags removed
    """
    return re.sub(r"<[^>]+>", "", text)
