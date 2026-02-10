"""
Text processing utilities for the job crawler.

This module contains functions for text manipulation, cleaning, and transformation.
"""

import re
import unicodedata


def safe_text(el, is_strip: bool = True, sep: str = " ") -> str:
    """
    Safely extract text from a BeautifulSoup element.

    Args:
        el: BeautifulSoup element to extract text from
        is_strip: Whether to strip whitespace from the result
        sep: Separator to use when joining text from child elements.
             Default is " " (space) to prevent words from merging.

    Returns:
        Extracted text or "N/A" if element is None/empty

    Note:
        The default separator is a space to prevent text from adjacent
        HTML elements being concatenated without spacing. For example:
        <li>Item 1</li><li>Item 2</li> becomes "Item 1 Item 2" instead of "Item 1Item 2"
    """
    if not el:
        return "N/A"
    txt = el.get_text(separator=sep, strip=is_strip)
    # Normalize whitespace - replace multiple spaces/newlines with single space
    if txt:
        txt = normalize_text(txt)
    return txt if txt else "N/A"


def normalize_text(text: str) -> str:
    """
    Normalize text by cleaning up spacing issues.

    Handles common issues from HTML text extraction:
    - Multiple consecutive spaces/newlines become single space
    - Adds space between lowercase and uppercase letters (camelCase from HTML)
    - Cleans up punctuation spacing

    Args:
        text: Text to normalize

    Returns:
        Normalized text with proper spacing

    Example:
        >>> normalize_text("tạiGiới thiệu")
        "tại Giới thiệu"
    """
    if not text:
        return ""

    # First, normalize multiple whitespace to single space
    text = re.sub(r"\s+", " ", text)

    # Add space between lowercase Vietnamese/ASCII letter followed by uppercase
    # This fixes cases like "tạiGiới" -> "tại Giới"
    # Pattern: lowercase letter (including Vietnamese) followed by uppercase letter
    text = re.sub(
        r"([a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ])([A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ])",
        r"\1 \2",
        text,
    )

    # Also handle cases where punctuation is followed directly by a letter without space
    # e.g., "đơnXây" should become "đơn Xây"
    text = re.sub(
        r"([.!?;:,])([A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ])",
        r"\1 \2",
        text,
    )

    # Clean up any double spaces that might have been introduced
    text = re.sub(r"  +", " ", text)

    return text.strip()


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
