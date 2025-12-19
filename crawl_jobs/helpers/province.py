"""
Vietnamese province utilities for the job crawler.

This module contains data and functions for handling Vietnamese
province/city names, used primarily for filtering skills and
processing location data.
"""

from typing import List, Set


# Vietnamese province names for filtering skills
# Includes both diacritic and non-diacritic versions for matching
VIETNAM_PROVINCES: Set[str] = {
    # Major cities
    "hà nội", "ha noi", "hanoi",
    "hồ chí minh", "ho chi minh", "hcm", "tp hcm", "tp. hcm", "sài gòn", "saigon",
    "đà nẵng", "da nang", "danang",
    "hải phòng", "hai phong", "haiphong",
    "cần thơ", "can tho", "cantho",
    
    # Southern provinces
    "bình dương", "binh duong",
    "đồng nai", "dong nai",
    "bà rịa - vũng tàu", "ba ria vung tau", "vũng tàu", "vung tau",
    "long an",
    "bình phước", "binh phuoc",
    "tây ninh", "tay ninh",
    "bến tre", "ben tre",
    "tiền giang", "tien giang",
    "kiên giang", "kien giang",
    "an giang",
    "đồng tháp", "dong thap",
    "bạc liêu", "bac lieu",
    "cà mau", "ca mau",
    "sóc trăng", "soc trang",
    "trà vinh", "tra vinh",
    "vĩnh long", "vinh long",
    "hậu giang", "hau giang",
    
    # Northern provinces
    "thái bình", "thai binh",
    "nam định", "nam dinh",
    "ninh bình", "ninh binh",
    "hà nam", "ha nam",
    "hưng yên", "hung yen",
    "hải dương", "hai duong",
    "bắc ninh", "bac ninh",
    "bắc giang", "bac giang",
    "phú thọ", "phu tho",
    "vĩnh phúc", "vinh phuc",
    "thái nguyên", "thai nguyen",
    "lạng sơn", "lang son",
    "quảng ninh", "quang ninh",
    "cao bằng", "cao bang",
    "bắc kạn", "bac kan",
    "tuyên quang", "tuyen quang",
    "hà giang", "ha giang",
    "lào cai", "lao cai",
    "yên bái", "yen bai",
    "sơn la", "son la",
    "lai châu", "lai chau",
    "điện biên", "dien bien",
    "hòa bình", "hoa binh",
    
    # Central provinces
    "thanh hóa", "thanh hoa",
    "nghệ an", "nghe an",
    "hà tĩnh", "ha tinh",
    "quảng bình", "quang binh",
    "quảng trị", "quang tri",
    "thừa thiên huế", "thua thien hue", "huế", "hue",
    "quảng nam", "quang nam",
    "quảng ngãi", "quang ngai",
    "bình định", "binh dinh",
    "phú yên", "phu yen",
    "khánh hòa", "khanh hoa", "nha trang",
    "ninh thuận", "ninh thuan",
    "bình thuận", "binh thuan",
    
    # Central Highlands
    "kon tum",
    "gia lai",
    "đắk lắk", "dak lak",
    "đắk nông", "dak nong",
    "lâm đồng", "lam dong", "đà lạt", "da lat",
    
    # Special terms
    "vietnam", "viet nam", "remote",
}


def is_likely_province(text: str) -> bool:
    """
    Check if a text string is likely a Vietnamese province name.
    
    Used to filter out locations from skills lists, preventing
    province names from being incorrectly classified as skills.
    
    Args:
        text: Text to check
        
    Returns:
        True if text appears to be a province name
        
    Example:
        >>> is_likely_province("Hồ Chí Minh")
        True
        >>> is_likely_province("Python")
        False
    """
    if not text:
        return False
    
    text_lower = text.lower().strip()
    
    # Direct match
    if text_lower in VIETNAM_PROVINCES:
        return True
    
    # Check if any province name is contained in the text
    for province in VIETNAM_PROVINCES:
        if province in text_lower or text_lower in province:
            return True
    
    return False


def process_province(locations: List[str]) -> List[str]:
    """
    Process and normalize a list of location strings.
    
    Filters out generic "Vietnam" entries and returns the most
    specific location available.
    
    Args:
        locations: List of location strings from job posting
        
    Returns:
        Filtered and normalized list of locations
        
    Example:
        >>> process_province(["Ho Chi Minh City", "Vietnam"])
        ["Ho Chi Minh City"]
    """
    if not locations:
        return []
        
    length = len(locations)
    if length > 1:
        return [locations[1] if ("Vietnam" not in locations[1]) else locations[0]]
    elif "Vietnam" in locations[0]:
        return []

    return locations


def normalize_province_name(name: str) -> str:
    """
    Normalize a province name for consistent matching.
    
    Converts to lowercase and removes extra whitespace.
    
    Args:
        name: Province name to normalize
        
    Returns:
        Normalized province name
    """
    return " ".join(name.lower().split())


def get_standard_province_name(text: str) -> str:
    """
    Get the standard Vietnamese province name from various formats.
    
    Args:
        text: Province name in any format
        
    Returns:
        Standard Vietnamese province name with diacritics,
        or original text if not recognized
    """
    # Mapping of common variations to standard names
    PROVINCE_MAPPING = {
        "hanoi": "Hà Nội",
        "ha noi": "Hà Nội",
        "hcm": "Hồ Chí Minh",
        "ho chi minh": "Hồ Chí Minh",
        "saigon": "Hồ Chí Minh",
        "danang": "Đà Nẵng",
        "da nang": "Đà Nẵng",
        "haiphong": "Hải Phòng",
        "hai phong": "Hải Phòng",
        "cantho": "Cần Thơ",
        "can tho": "Cần Thơ",
        # Add more mappings as needed
    }
    
    normalized = normalize_province_name(text)
    return PROVINCE_MAPPING.get(normalized, text)
