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
    "hà nội",
    "ha noi",
    "hanoi",
    "hồ chí minh",
    "ho chi minh",
    "hcm",
    "tp hcm",
    "tp. hcm",
    "sài gòn",
    "saigon",
    "đà nẵng",
    "da nang",
    "danang",
    "hải phòng",
    "hai phong",
    "haiphong",
    "cần thơ",
    "can tho",
    "cantho",
    # Southern provinces
    "bình dương",
    "binh duong",
    "đồng nai",
    "dong nai",
    "bà rịa - vũng tàu",
    "ba ria vung tau",
    "vũng tàu",
    "vung tau",
    "long an",
    "bình phước",
    "binh phuoc",
    "tây ninh",
    "tay ninh",
    "bến tre",
    "ben tre",
    "tiền giang",
    "tien giang",
    "kiên giang",
    "kien giang",
    "an giang",
    "đồng tháp",
    "dong thap",
    "bạc liêu",
    "bac lieu",
    "cà mau",
    "ca mau",
    "sóc trăng",
    "soc trang",
    "trà vinh",
    "tra vinh",
    "vĩnh long",
    "vinh long",
    "hậu giang",
    "hau giang",
    # Northern provinces
    "thái bình",
    "thai binh",
    "nam định",
    "nam dinh",
    "ninh bình",
    "ninh binh",
    "hà nam",
    "ha nam",
    "hưng yên",
    "hung yen",
    "hải dương",
    "hai duong",
    "bắc ninh",
    "bac ninh",
    "bắc giang",
    "bac giang",
    "phú thọ",
    "phu tho",
    "vĩnh phúc",
    "vinh phuc",
    "thái nguyên",
    "thai nguyen",
    "lạng sơn",
    "lang son",
    "quảng ninh",
    "quang ninh",
    "cao bằng",
    "cao bang",
    "bắc kạn",
    "bac kan",
    "tuyên quang",
    "tuyen quang",
    "hà giang",
    "ha giang",
    "lào cai",
    "lao cai",
    "yên bái",
    "yen bai",
    "sơn la",
    "son la",
    "lai châu",
    "lai chau",
    "điện biên",
    "dien bien",
    "hòa bình",
    "hoa binh",
    # Central provinces
    "thanh hóa",
    "thanh hoa",
    "nghệ an",
    "nghe an",
    "hà tĩnh",
    "ha tinh",
    "quảng bình",
    "quang binh",
    "quảng trị",
    "quang tri",
    "thừa thiên huế",
    "thua thien hue",
    "huế",
    "hue",
    "quảng nam",
    "quang nam",
    "quảng ngãi",
    "quang ngai",
    "bình định",
    "binh dinh",
    "phú yên",
    "phu yen",
    "khánh hòa",
    "khanh hoa",
    "nha trang",
    "ninh thuận",
    "ninh thuan",
    "bình thuận",
    "binh thuan",
    # Central Highlands
    "kon tum",
    "gia lai",
    "đắk lắk",
    "dak lak",
    "đắk nông",
    "dak nong",
    "lâm đồng",
    "lam dong",
    "đà lạt",
    "da lat",
    # Special terms
    "vietnam",
    "viet nam",
    "remote",
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


def clean_province_input(text: str) -> str:
    """
    Clean a province/location string by removing common prefixes, suffixes,
    and extra whitespace.

    Args:
        text: Raw location text from crawler

    Returns:
        Cleaned location string
    """
    if not text:
        return ""

    cleaned = text.strip()

    # Remove common suffixes
    for suffix in [" City", " city", " Province", " province"]:
        if cleaned.endswith(suffix):
            cleaned = cleaned[: -len(suffix)].strip()

    # Remove common prefixes
    for prefix in ["TP. ", "TP.", "TP ", "Tỉnh ", "Thành phố ", "T.P "]:
        if cleaned.startswith(prefix):
            cleaned = cleaned[len(prefix) :].strip()

    return cleaned


# Comprehensive mapping of crawled location variations → canonical DB province names.
# Keys are lowercase. Values must match exactly the `name` column in the `provinces` table.
PROVINCE_ALIAS_MAP = {
    # --- Hà Nội ---
    "ha noi": "Hà Nội",
    "hanoi": "Hà Nội",
    "hà nội": "Hà Nội",
    # --- Hồ Chí Minh ---
    "ho chi minh": "Hồ Chí Minh",
    "hồ chí minh": "Hồ Chí Minh",
    "hcm": "Hồ Chí Minh",
    "tp hcm": "Hồ Chí Minh",
    "tp. hcm": "Hồ Chí Minh",
    "tp.hcm": "Hồ Chí Minh",
    "saigon": "Hồ Chí Minh",
    "sài gòn": "Hồ Chí Minh",
    # --- Đà Nẵng ---
    "da nang": "Đà Nẵng",
    "danang": "Đà Nẵng",
    "đà nẵng": "Đà Nẵng",
    # --- Hải Phòng ---
    "hai phong": "Hải Phòng",
    "haiphong": "Hải Phòng",
    "hải phòng": "Hải Phòng",
    # --- Cần Thơ ---
    "can tho": "Cần Thơ",
    "cantho": "Cần Thơ",
    "cần thơ": "Cần Thơ",
    # --- Bình Dương ---
    "binh duong": "Bình Dương",
    "bình dương": "Bình Dương",
    # --- Đồng Nai ---
    "dong nai": "Đồng Nai",
    "đồng nai": "Đồng Nai",
    # --- Bà Rịa - Vũng Tàu ---
    "ba ria vung tau": "Bà Rịa - Vũng Tàu",
    "bà rịa - vũng tàu": "Bà Rịa - Vũng Tàu",
    "bà rịa vũng tàu": "Bà Rịa - Vũng Tàu",
    "vung tau": "Bà Rịa - Vũng Tàu",
    "vũng tàu": "Bà Rịa - Vũng Tàu",
    # --- Long An ---
    "long an": "Long An",
    # --- Bình Phước ---
    "binh phuoc": "Bình Phước",
    "bình phước": "Bình Phước",
    # --- Tây Ninh ---
    "tay ninh": "Tây Ninh",
    "tây ninh": "Tây Ninh",
    # --- Bến Tre ---
    "ben tre": "Bến Tre",
    "bến tre": "Bến Tre",
    # --- Tiền Giang ---
    "tien giang": "Tiền Giang",
    "tiền giang": "Tiền Giang",
    # --- Kiên Giang ---
    "kien giang": "Kiên Giang",
    "kiên giang": "Kiên Giang",
    # --- An Giang ---
    "an giang": "An Giang",
    # --- Đồng Tháp ---
    "dong thap": "Đồng Tháp",
    "đồng tháp": "Đồng Tháp",
    # --- Bạc Liêu ---
    "bac lieu": "Bạc Liêu",
    "bạc liêu": "Bạc Liêu",
    # --- Cà Mau ---
    "ca mau": "Cà Mau",
    "cà mau": "Cà Mau",
    # --- Sóc Trăng ---
    "soc trang": "Sóc Trăng",
    "sóc trăng": "Sóc Trăng",
    # --- Trà Vinh ---
    "tra vinh": "Trà Vinh",
    "trà vinh": "Trà Vinh",
    # --- Vĩnh Long ---
    "vinh long": "Vĩnh Long",
    "vĩnh long": "Vĩnh Long",
    # --- Hậu Giang ---
    "hau giang": "Hậu Giang",
    "hậu giang": "Hậu Giang",
    # --- Thái Bình ---
    "thai binh": "Thái Bình",
    "thái bình": "Thái Bình",
    # --- Nam Định ---
    "nam dinh": "Nam Định",
    "nam định": "Nam Định",
    # --- Ninh Bình ---
    "ninh binh": "Ninh Bình",
    "ninh bình": "Ninh Bình",
    # --- Hà Nam ---
    "ha nam": "Hà Nam",
    "hà nam": "Hà Nam",
    # --- Hưng Yên ---
    "hung yen": "Hưng Yên",
    "hưng yên": "Hưng Yên",
    # --- Hải Dương ---
    "hai duong": "Hải Dương",
    "hải dương": "Hải Dương",
    # --- Bắc Ninh ---
    "bac ninh": "Bắc Ninh",
    "bắc ninh": "Bắc Ninh",
    # --- Bắc Giang ---
    "bac giang": "Bắc Giang",
    "bắc giang": "Bắc Giang",
    # --- Phú Thọ ---
    "phu tho": "Phú Thọ",
    "phú thọ": "Phú Thọ",
    # --- Vĩnh Phúc ---
    "vinh phuc": "Vĩnh Phúc",
    "vĩnh phúc": "Vĩnh Phúc",
    # --- Thái Nguyên ---
    "thai nguyen": "Thái Nguyên",
    "thái nguyên": "Thái Nguyên",
    # --- Lạng Sơn ---
    "lang son": "Lạng Sơn",
    "lạng sơn": "Lạng Sơn",
    # --- Quảng Ninh ---
    "quang ninh": "Quảng Ninh",
    "quảng ninh": "Quảng Ninh",
    # --- Cao Bằng ---
    "cao bang": "Cao Bằng",
    "cao bằng": "Cao Bằng",
    # --- Bắc Kạn ---
    "bac kan": "Bắc Kạn",
    "bắc kạn": "Bắc Kạn",
    "bac can": "Bắc Kạn",
    # --- Tuyên Quang ---
    "tuyen quang": "Tuyên Quang",
    "tuyên quang": "Tuyên Quang",
    # --- Hà Giang ---
    "ha giang": "Hà Giang",
    "hà giang": "Hà Giang",
    # --- Lào Cai ---
    "lao cai": "Lào Cai",
    "lào cai": "Lào Cai",
    # --- Yên Bái ---
    "yen bai": "Yên Bái",
    "yên bái": "Yên Bái",
    # --- Sơn La ---
    "son la": "Sơn La",
    "sơn la": "Sơn La",
    # --- Lai Châu ---
    "lai chau": "Lai Châu",
    "lai châu": "Lai Châu",
    # --- Điện Biên ---
    "dien bien": "Điện Biên",
    "điện biên": "Điện Biên",
    # --- Hòa Bình ---
    "hoa binh": "Hòa Bình",
    "hòa bình": "Hòa Bình",
    # --- Thanh Hóa ---
    "thanh hoa": "Thanh Hóa",
    "thanh hóa": "Thanh Hóa",
    # --- Nghệ An ---
    "nghe an": "Nghệ An",
    "nghệ an": "Nghệ An",
    # --- Hà Tĩnh ---
    "ha tinh": "Hà Tĩnh",
    "hà tĩnh": "Hà Tĩnh",
    # --- Quảng Bình ---
    "quang binh": "Quảng Bình",
    "quảng bình": "Quảng Bình",
    # --- Quảng Trị ---
    "quang tri": "Quảng Trị",
    "quảng trị": "Quảng Trị",
    # --- Thừa Thiên Huế ---
    "thua thien hue": "Thừa Thiên Huế",
    "thừa thiên huế": "Thừa Thiên Huế",
    "hue": "Thừa Thiên Huế",
    "huế": "Thừa Thiên Huế",
    # --- Quảng Nam ---
    "quang nam": "Quảng Nam",
    "quảng nam": "Quảng Nam",
    # --- Quảng Ngãi ---
    "quang ngai": "Quảng Ngãi",
    "quảng ngãi": "Quảng Ngãi",
    # --- Bình Định ---
    "binh dinh": "Bình Định",
    "bình định": "Bình Định",
    # --- Phú Yên ---
    "phu yen": "Phú Yên",
    "phú yên": "Phú Yên",
    # --- Khánh Hòa ---
    "khanh hoa": "Khánh Hòa",
    "khánh hòa": "Khánh Hòa",
    "nha trang": "Khánh Hòa",
    # --- Ninh Thuận ---
    "ninh thuan": "Ninh Thuận",
    "ninh thuận": "Ninh Thuận",
    # --- Bình Thuận ---
    "binh thuan": "Bình Thuận",
    "bình thuận": "Bình Thuận",
    # --- Kon Tum ---
    "kon tum": "Kon Tum",
    # --- Gia Lai ---
    "gia lai": "Gia Lai",
    # --- Đắk Lắk ---
    "dak lak": "Đắk Lắk",
    "đắk lắk": "Đắk Lắk",
    "dac lac": "Đắk Lắk",
    # --- Đắk Nông ---
    "dak nong": "Đắk Nông",
    "đắk nông": "Đắk Nông",
    # --- Lâm Đồng ---
    "lam dong": "Lâm Đồng",
    "lâm đồng": "Lâm Đồng",
    "da lat": "Lâm Đồng",
    "đà lạt": "Lâm Đồng",
}


def get_standard_province_name(text: str) -> str:
    """
    Get the standard Vietnamese province name from various formats.

    Uses a comprehensive alias map to normalize crawled location names
    to match the canonical province names in the database.

    Args:
        text: Province name in any format (English, non-diacritic, abbreviated, etc.)

    Returns:
        Standard Vietnamese province name with diacritics,
        or the cleaned input text if not recognized
    """
    cleaned = clean_province_input(text)
    normalized = normalize_province_name(cleaned)
    return PROVINCE_ALIAS_MAP.get(normalized, cleaned)
