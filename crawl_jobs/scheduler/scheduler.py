import time
import random
from collections import defaultdict, deque
from typing import Callable, Dict, Any, Optional, List
from urllib.parse import urlparse
from dataclasses import dataclass, field
import cloudscraper


@dataclass
class DomainConfig:
    """Configuration for per-domain crawling behavior."""
    min_delay: float = 2.0  # Minimum seconds between requests
    max_delay: float = 5.0  # Maximum seconds between requests
    max_concurrent: int = 1  # Max concurrent requests per domain
    max_retries: int = 3  # Max retry attempts
    backoff_base: float = 2.0  # Exponential backoff multiplier
    last_request_time: float = field(default_factory=time.time)
    active_requests: int = 0
    failure_count: int = 0
    success_count: int = 0


class RoundRobinScheduler:
    """
    Round-robin scheduler that distributes crawling load across domains.
    Prevents hammering a single site and reduces detection risk.
    """
    
    def __init__(self, 
                 default_min_delay: float = 2.0,
                 default_max_delay: float = 5.0,
                 max_concurrent_per_domain: int = 1,
                 session_rotation_interval: int = 50):
        """
        Initialize the round-robin scheduler.
        
        Args:
            default_min_delay: Default minimum delay between requests (seconds)
            default_max_delay: Default maximum delay between requests (seconds)
            max_concurrent_per_domain: Max concurrent requests per domain
            session_rotation_interval: Recreate scraper after N requests
        """
        self.domains: Dict[str, DomainConfig] = {}
        self.domain_queue: deque = deque()
        self.default_min_delay = default_min_delay
        self.default_max_delay = default_max_delay
        self.max_concurrent_per_domain = max_concurrent_per_domain
        self.session_rotation_interval = session_rotation_interval
        self.request_count = 0
        self.scraper_pool: Dict[str, cloudscraper.CloudScraper] = {}
        self.scraper_request_counts: Dict[str, int] = defaultdict(int)
        
    def _get_domain(self, url: str) -> str:
        """Extract domain from URL."""
        return urlparse(url).netloc.lower()
    
    def _get_domain_config(self, domain: str) -> DomainConfig:
        """Get or create domain configuration."""
        if domain not in self.domains:
            self.domains[domain] = DomainConfig(
                min_delay=self.default_min_delay,
                max_delay=self.default_max_delay,
                max_concurrent=self.max_concurrent_per_domain
            )
            self.domain_queue.append(domain)
        return self.domains[domain]
    
    def _get_scraper(self, domain: str) -> cloudscraper.CloudScraper:
        """Get or create a cloudscraper for the domain with session rotation."""
        # Rotate scraper if too many requests
        if domain in self.scraper_pool:
            if self.scraper_request_counts[domain] >= self.session_rotation_interval:
                print(f"[Scheduler] Rotating scraper for {domain} after {self.scraper_request_counts[domain]} requests")
                del self.scraper_pool[domain]
                self.scraper_request_counts[domain] = 0

        if domain not in self.scraper_pool:
            # Randomize browser configuration
            browsers = [
                {'browser': 'chrome', 'platform': 'windows', 'mobile': False},
                {'browser': 'chrome', 'platform': 'darwin', 'mobile': False},
                {'browser': 'firefox', 'platform': 'windows', 'mobile': False},
            ]
            browser_config = random.choice(browsers)
            self.scraper_pool[domain] = cloudscraper.create_scraper(browser=browser_config)

        return self.scraper_pool[domain]
    
    def _calculate_delay(self, config: DomainConfig) -> float:
        """Calculate delay with jitter and adaptive adjustment."""
        base_delay = random.uniform(config.min_delay, config.max_delay)
        
        # Add jitter (±20%)
        jitter = base_delay * random.uniform(-0.2, 0.2)
        delay = base_delay + jitter
        
        # Adaptive delay based on failure rate
        if config.success_count > 0:
            failure_rate = config.failure_count / (config.success_count + config.failure_count)
            if failure_rate > 0.3:  # If >30% failures, slow down
                delay *= (1 + failure_rate)
        
        return max(0.5, delay)  # Minimum 0.5s
    
    def _wait_for_slot(self, domain: str):
        """Wait until it's safe to make a request to this domain."""
        config = self._get_domain_config(domain)
        
        # Wait for rate limit
        elapsed = time.time() - config.last_request_time
        required_delay = self._calculate_delay(config)
        
        if elapsed < required_delay:
            wait_time = required_delay - elapsed
            print(f"[Scheduler] Waiting {wait_time:.2f}s before next {domain} request")
            time.sleep(wait_time)
        
        # Wait for concurrency slot
        while config.active_requests >= config.max_concurrent:
            time.sleep(0.1)
        
        config.active_requests += 1
        config.last_request_time = time.time()
    
    def _release_slot(self, domain: str):
        """Release a concurrency slot for the domain."""
        config = self._get_domain_config(domain)
        config.active_requests = max(0, config.active_requests - 1)
    
    def _exponential_backoff(self, attempt: int, base_delay: float = 2.0) -> float:
        """Calculate exponential backoff with jitter."""
        delay = base_delay * (2 ** attempt)
        jitter = delay * random.uniform(0, 0.3)
        return min(delay + jitter, 60)  # Cap at 60 seconds
    
    def fetch_with_retry(self, 
                        url: str, 
                        headers: Optional[Dict] = None,
                        method: str = "GET",
                        **kwargs) -> Optional[Any]:
        """
        Fetch URL with automatic retry and exponential backoff.
        
        Args:
            url: URL to fetch
            headers: Optional headers dictionary
            method: HTTP method (GET, POST, etc.)
            **kwargs: Additional arguments to pass to scraper
            
        Returns:
            Response object or None if all retries failed
        """
        domain = self._get_domain(url)
        config = self._get_domain_config(domain)
        scraper = self._get_scraper(domain)
        
        for attempt in range(config.max_retries):
            try:
                # Wait for rate limit and concurrency slot
                self._wait_for_slot(domain)
                
                self.request_count += 1
                self.scraper_request_counts[domain] += 1
                
                # Make request
                if method.upper() == "GET":
                    response = scraper.get(url, headers=headers, **kwargs)
                elif method.upper() == "POST":
                    response = scraper.post(url, headers=headers, **kwargs)
                else:
                    raise ValueError(f"Unsupported method: {method}")
                
                # Check for common blocking patterns
                if response.status_code == 200:
                    if "just a moment" in response.text.lower() or \
                       "access denied" in response.text.lower() or \
                       "captcha" in response.text.lower():
                        print(f"[Scheduler] Possible block detected on {domain}, retrying...")
                        config.failure_count += 1
                        raise Exception("Possible CAPTCHA or block page")
                    
                    # Success
                    config.success_count += 1
                    self._release_slot(domain)
                    return response
                
                elif response.status_code == 429:  # Rate limited
                    print(f"[Scheduler] Rate limited by {domain} (429)")
                    config.failure_count += 1
                    retry_after = response.headers.get('Retry-After')
                    if retry_after:
                        wait_time = float(retry_after)
                    else:
                        wait_time = self._exponential_backoff(attempt, config.backoff_base)
                    print(f"[Scheduler] Waiting {wait_time:.2f}s before retry...")
                    time.sleep(wait_time)
                
                elif response.status_code >= 500:  # Server error
                    print(f"[Scheduler] Server error {response.status_code} from {domain}")
                    config.failure_count += 1
                    wait_time = self._exponential_backoff(attempt, config.backoff_base)
                    time.sleep(wait_time)
                
                else:  # Other error
                    print(f"[Scheduler] HTTP {response.status_code} from {domain}")
                    config.failure_count += 1
                    self._release_slot(domain)
                    return response  # Return even on error for caller to handle
                    
            except Exception as e:
                print(f"[Scheduler] Error fetching {url} (attempt {attempt + 1}/{config.max_retries}): {e}")
                config.failure_count += 1
                
                if attempt < config.max_retries - 1:
                    wait_time = self._exponential_backoff(attempt, config.backoff_base)
                    time.sleep(wait_time)
                else:
                    self._release_slot(domain)
                    return None
            
            finally:
                if attempt == config.max_retries - 1:
                    self._release_slot(domain)
        
        print(f"[Scheduler] Failed to fetch {url} after {config.max_retries} attempts")
        return None
    
    def crawl_with_round_robin(self,
                               urls: List[str],
                               callback: Callable[[str, Any], Any],
                               headers_factory: Optional[Callable[[], Dict]] = None):
        """
        Crawl multiple URLs using round-robin scheduling across domains.
        
        Args:
            urls: List of URLs to crawl
            callback: Function to call with (url, response) for each successful fetch
            headers_factory: Optional function that generates headers for each request
        """
        # Group URLs by domain
        domain_urls: Dict[str, List[str]] = defaultdict(list)
        for url in urls:
            domain = self._get_domain(url)
            domain_urls[domain].append(url)
        
        # Convert to queues for round-robin
        domain_queues = {domain: deque(urls) for domain, urls in domain_urls.items()}
        
        print(f"[Scheduler] Crawling {len(urls)} URLs across {len(domain_queues)} domains")
        
        completed = 0
        failed = 0
        
        # Round-robin through domains
        while domain_queues:
            # Get domains with remaining URLs
            active_domains = [d for d, q in domain_queues.items() if q]
            
            if not active_domains:
                break
            
            # Round-robin: process one URL from each domain
            for domain in active_domains:
                if not domain_queues[domain]:
                    continue
                
                url = domain_queues[domain].popleft()
                headers = headers_factory() if headers_factory else None
                
                print(f"\n[Scheduler] [{completed + failed + 1}/{len(urls)}] Fetching {url}")
                response = self.fetch_with_retry(url, headers=headers)
                
                if response and response.status_code == 200:
                    try:
                        callback(url, response)
                        completed += 1
                        print(f"[Scheduler] ✓ Success ({completed} completed, {failed} failed)")
                    except Exception as e:
                        print(f"[Scheduler] ✗ Callback error: {e}")
                        failed += 1
                else:
                    failed += 1
                    print(f"[Scheduler] ✗ Failed ({completed} completed, {failed} failed)")
            
            # Remove empty queues
            domain_queues = {d: q for d, q in domain_queues.items() if q}
        
        print(f"\n[Scheduler] Crawling complete: {completed} succeeded, {failed} failed")
        self._print_stats()
    
    def _print_stats(self):
        """Print crawling statistics."""
        print("\n[Scheduler] Domain Statistics:")
        for domain, config in self.domains.items():
            total = config.success_count + config.failure_count
            success_rate = (config.success_count / total * 100) if total > 0 else 0
            print(f"  {domain}: {config.success_count}/{total} successful ({success_rate:.1f}%)")
    
    def configure_domain(self, 
                        domain: str,
                        min_delay: Optional[float] = None,
                        max_delay: Optional[float] = None,
                        max_concurrent: Optional[int] = None,
                        max_retries: Optional[int] = None):
        """
        Configure specific settings for a domain.
        
        Args:
            domain: Domain to configure
            min_delay: Minimum delay between requests
            max_delay: Maximum delay between requests
            max_concurrent: Max concurrent requests
            max_retries: Max retry attempts
        """
        config = self._get_domain_config(domain)
        
        if min_delay is not None:
            config.min_delay = min_delay
        if max_delay is not None:
            config.max_delay = max_delay
        if max_concurrent is not None:
            config.max_concurrent = max_concurrent
        if max_retries is not None:
            config.max_retries = max_retries
        
        print(f"[Scheduler] Configured {domain}: delay={config.min_delay}-{config.max_delay}s, "
              f"concurrent={config.max_concurrent}, retries={config.max_retries}")


class EnhancedCrawler:
    """
    Enhanced crawler wrapper that integrates round-robin scheduling
    """
    
    def __init__(self, scheduler: Optional[RoundRobinScheduler] = None):
        """
        Initialize enhanced crawler.
        
        Args:
            scheduler: Optional RoundRobinScheduler instance. Creates default if None.
        """
        self.scheduler = scheduler or RoundRobinScheduler()
        self.user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.126 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        ]
    
    def get_headers(self) -> Dict[str, str]:
        """Generate randomized headers for each request."""
        # Randomize Accept-Language to mimic different users
        languages = [
            "en-US,en;q=0.9,vi;q=0.8",
            "en-US,en;q=0.9",
            "en-GB,en;q=0.9",
            "vi-VN,vi;q=0.9,en;q=0.8",
        ]
        
        return {
            "User-Agent": random.choice(self.user_agents),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": random.choice(languages),
            "Accept-Encoding": "gzip, deflate, br",
            "DNT": str(random.choice(["1", "1", None])),  # 2/3 chance of DNT
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
        }
    
    def crawl_pages(self,
                   scrape_page_callback: Callable,
                   base_url: str,
                   pages: int = 1,
                   start_page: int = 1,
                   min_delay: float = 2.0,
                   max_delay: float = 5.0) -> Dict[str, Any]:
        """
        Crawl multiple pages using the scheduler.
        
        Args:
            scrape_page_callback: Function(scraper, page_num, headers) -> dict
            base_url: Base URL for the site
            pages: Number of pages to crawl
            start_page: Starting page number
            min_delay: Minimum delay between requests
            max_delay: Maximum delay between requests
            
        Returns:
            Dictionary of all collected data
        """
        domain = self.scheduler._get_domain(base_url)
        self.scheduler.configure_domain(
            domain,
            min_delay=min_delay,
            max_delay=max_delay
        )
        
        all_companies = {}
        
        for page_num in range(start_page, start_page + pages):
            attempts = 0
            max_attempts = 3
            
            while attempts < max_attempts:
                attempts += 1
                print(f"\n[EnhancedCrawler] Scraping page {page_num} (attempt {attempts})")
                
                try:
                    # Use scheduler to get scraper for this domain
                    scraper = self.scheduler._get_scraper(domain)
                    headers = self.get_headers()
                    
                    # Call the page scraping function
                    page_companies = scrape_page_callback(scraper, page_num, headers)
                    
                    # Merge results
                    for name, data in page_companies.items():
                        if name not in all_companies:
                            all_companies[name] = data
                        else:
                            all_companies[name]["jobs"].update(data["jobs"])
                    
                    print(f"[EnhancedCrawler] ✓ Page {page_num} complete: {len(page_companies)} companies")
                    break
                    
                except Exception as e:
                    print(f"[EnhancedCrawler] ✗ Error on page {page_num}: {e}")
                    if attempts >= max_attempts:
                        print(f"[EnhancedCrawler] Skipping page {page_num} after {max_attempts} failures")
                        break
                    
                    # Exponential backoff
                    wait_time = self.scheduler._exponential_backoff(attempts - 1)
                    time.sleep(wait_time)
            
            # Wait between pages (already handled by scheduler, but add small buffer)
            if page_num < start_page + pages - 1:
                time.sleep(random.uniform(0.5, 1.5))
        
        return all_companies
