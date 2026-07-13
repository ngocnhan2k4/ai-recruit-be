"""
Text processing utilities for the job crawler.

This module contains functions for text manipulation, cleaning, and transformation.
"""

import re
import unicodedata


def safe_text(el, is_strip: bool = True, sep: str = " ", normalize_camel_case: bool = True) -> str:
    """
    Safely extract text from a BeautifulSoup element.

    Args:
        el: BeautifulSoup element to extract text from
        is_strip: Whether to strip whitespace from the result
        sep: Separator to use when joining text from child elements.
        normalize_camel_case: Whether to split camelCase strings.

    Returns:
        Extracted text or "N/A" if element is None/empty
    """
    if not el:
        return "N/A"
    txt = el.get_text(separator=sep, strip=is_strip)
    if txt:
        txt = normalize_text(txt, normalize_camel_case=normalize_camel_case)
    return txt if txt else "N/A"


def normalize_text(text: str, normalize_camel_case: bool = True) -> str:
    """
    Normalize text by cleaning up spacing issues.

    Handles: multiple whitespace, camelCase from HTML, punctuation spacing.

    Example:
        >>> normalize_text("tạiGiới thiệu")
        "tại Giới thiệu"
    """
    if not text:
        return ""

    text = re.sub(r"\s+", " ", text)

    if normalize_camel_case:
        # Add space between lowercase Vietnamese/ASCII letter followed by uppercase
        text = re.sub(
            r"([a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ])([A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ])",
            r"\1 \2",
            text,
        )

    # Handle punctuation followed directly by uppercase letter
    text = re.sub(
        r"([.!?;:,])([A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ])",
        r"\1 \2",
        text,
    )

    text = re.sub(r"  +", " ", text)
    return text.strip()


def slugify(text: str) -> str:
    """
    Convert text to a URL-friendly slug.

    Example:
        >>> slugify("Công ty ABC")
        "cong-ty-abc"
    """
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def html_to_mixed_content(element) -> str:
    """
    Convert an HTML element to mixed content: markdown headings (##) + raw HTML body.

    Section headings (h1-h6) become markdown ## headings.
    All other content within each section is kept as raw HTML.
    This allows the frontend to render both markdown headings and HTML content.

    Output format example:
        ## Mô tả công việc

        <p><strong>Some description here</strong></p>

        ## Yêu cầu công việc

        <p>Requirements content...</p>

    Args:
        element: BeautifulSoup Tag/element, or raw HTML string

    Returns:
        Mixed markdown+HTML string, or empty string if input is None/empty
    """
    from bs4 import BeautifulSoup as BS, Tag, NavigableString

    if not element:
        return ""

    # Parse to BeautifulSoup if needed
    if isinstance(element, str):
        soup = BS(element, "html.parser")
    elif hasattr(element, "children"):
        soup = element
    else:
        return ""

    # Remove unwanted tags entirely (icons, scripts, images, etc.)
    for tag in soup.find_all({"img", "script", "style", "iframe", "svg", "noscript", "i"}):
        tag.decompose()

    # Unwrap <a> tags: keep their text content but remove the link wrapper
    for tag in soup.find_all("a"):
        tag.unwrap()

    HEADING_TAGS = {"h1", "h2", "h3", "h4", "h5", "h6"}

    parts = []
    current_body_parts = []

    def _flush_body():
        if current_body_parts:
            body_html = "".join(current_body_parts).strip()
            if body_html:
                parts.append(body_html)
            current_body_parts.clear()

    def _get_inner_html(tag):
        return "".join(str(child) for child in tag.children).strip()

    def _process_children(parent):
        for child in parent.children:
            if isinstance(child, NavigableString):
                text = str(child)
                if text.strip():
                    current_body_parts.append(text)
            elif isinstance(child, Tag):
                if child.name in HEADING_TAGS:
                    _flush_body()
                    heading_text = child.get_text(strip=True)
                    if heading_text:
                        parts.append(f"## {heading_text}")
                elif child.name in ("div", "section", "article"):
                    # Recurse into containers that have headings
                    if child.find(HEADING_TAGS):
                        _process_children(child)
                    else:
                        inner = _get_inner_html(child)
                        if inner:
                            current_body_parts.append(inner)
                else:
                    html_str = str(child)
                    if html_str.strip():
                        current_body_parts.append(html_str)

    _process_children(soup)
    _flush_body()

    result = "\n\n".join(parts)
    result = re.sub(r"\n{3,}", "\n\n", result)
    result = "\n".join(line.rstrip() for line in result.split("\n"))

    return result.strip()