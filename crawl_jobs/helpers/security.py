"""
Security utilities for the job crawler.

This module contains functions for validating inputs and
protecting against security vulnerabilities like SSRF.
"""

import ipaddress
import socket
from typing import List
from urllib.parse import urlparse


# Blacklist of dangerous URL schemes
DISALLOWED_SCHEMES: List[str] = ["file", "ftp", "gopher", "dict"]

# Blacklist of private and reserved IP networks (SSRF protection)
BLACKLISTED_NETWORKS = [
    ipaddress.ip_network("10.0.0.0/8"),       # Private range
    ipaddress.ip_network("172.16.0.0/12"),    # Private range
    ipaddress.ip_network("192.168.0.0/16"),   # Private range
    ipaddress.ip_network("169.254.0.0/16"),   # Link-local
    ipaddress.ip_network("0.0.0.0/8"),        # Reserved
    ipaddress.ip_network("127.0.0.0/8"),      # Loopback
    ipaddress.ip_network("::1/128"),          # IPv6 loopback
    ipaddress.ip_network("fc00::/7"),         # IPv6 private
    ipaddress.ip_network("fe80::/10"),        # IPv6 link-local
]


def is_safe_db_url(url_string: str) -> bool:
    """
    Validate a database URL against common SSRF attack patterns.
    
    Checks for:
    1. Dangerous URL schemes (file, ftp, etc.)
    2. Private/internal IP addresses
    3. Reserved IP ranges
    
    This prevents attackers from using the crawler to scan internal
    networks or access local files.
    
    Args:
        url_string: Database connection URL to validate
        
    Returns:
        True if the URL is considered safe, False otherwise
        
    Example:
        >>> is_safe_db_url("postgresql://user:pass@db.example.com/mydb")
        True
        >>> is_safe_db_url("postgresql://user:pass@192.168.1.1/mydb")
        False  # Private IP
    """
    try:
        parsed_url = urlparse(url_string)
        hostname = parsed_url.hostname

        if not hostname:
            print("Error: DB URL has no hostname.")
            return False

        if parsed_url.scheme in DISALLOWED_SCHEMES:
            print(f"Error: URL scheme '{parsed_url.scheme}' is not allowed.")
            return False

        # Resolve hostname to an IP address
        try:
            resolved_ip = ipaddress.ip_address(socket.gethostbyname(hostname))
        except socket.gaierror as e:
            print(f"Error resolving hostname '{hostname}': {e}")
            return False

        # Check if the resolved IP is in any blacklisted network
        for network in BLACKLISTED_NETWORKS:
            if resolved_ip in network:
                print(
                    f"Error: DB host '{hostname}' resolves to a blacklisted IP address '{resolved_ip}'."
                )
                return False

    except ValueError as e:
        print(f"Error validating DB URL: {e}")
        return False

    # If all checks pass, the URL is considered safe
    return True


def sanitize_input(text: str, max_length: int = 1000) -> str:
    """
    Sanitize user input by removing potentially dangerous characters.
    
    Args:
        text: Input text to sanitize
        max_length: Maximum allowed length
        
    Returns:
        Sanitized text
    """
    if not text:
        return ""
    
    # Truncate to max length
    text = text[:max_length]
    
    # Remove null bytes and control characters (except newlines/tabs)
    sanitized = "".join(
        char for char in text 
        if char == '\n' or char == '\t' or (ord(char) >= 32 and ord(char) != 127)
    )
    
    return sanitized


def is_valid_url(url: str) -> bool:
    """
    Validate that a string is a properly formatted URL.
    
    Args:
        url: URL string to validate
        
    Returns:
        True if valid URL format
    """
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except Exception:
        return False
