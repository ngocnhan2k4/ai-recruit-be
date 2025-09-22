from datetime import datetime, timedelta
import re

def safe_text(el, is_strip=True):
    if not el:
        return "N/A"
    txt = el.get_text(strip=is_strip)
    return txt if txt else "N/A"


def get_date_posted(loc_span):
    for idx, span in enumerate(loc_span):
        if idx < 2:
            continue
        text = safe_text(span)
        if re.search(r"\d", text) and re.search(r"\bago\b", text, re.IGNORECASE):
            return text
    return None


def parse_posted_date(text: str) -> datetime:
    clean = re.sub(r"\s+", " ", text).strip()

    m = re.search(r"(\d+)\s*(minute|hour|day)", clean, re.IGNORECASE)
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
    else:
        raise ValueError(f"Unknown unit in date string: {text!r}")