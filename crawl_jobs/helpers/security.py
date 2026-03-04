"""
Security utilities for the job crawler.

Validates database URLs against SSRF attack patterns.
"""

import ipaddress
import socket
from urllib.parse import urlparse


# Blacklist of dangerous URL schemes and private IP networks
DISALLOWED_SCHEMES = ["file", "ftp", "gopher", "dict"]

BLACKLISTED_NETWORKS = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]


def is_safe_db_url(url_string: str) -> bool:
    """
    Validate a database URL against SSRF attack patterns.

    Checks for dangerous URL schemes and private/internal IP addresses.
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

        try:
            resolved_ip = ipaddress.ip_address(socket.gethostbyname(hostname))
        except socket.gaierror as e:
            print(f"Error resolving hostname '{hostname}': {e}")
            return False

        for network in BLACKLISTED_NETWORKS:
            if resolved_ip in network:
                print(
                    f"Error: DB host '{hostname}' resolves to a blacklisted IP '{resolved_ip}'."
                )
                return False

    except ValueError as e:
        print(f"Error validating DB URL: {e}")
        return False

    return True
