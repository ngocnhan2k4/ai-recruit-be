import argparse

from crawls.itviec import itviec_crawl
from crawls.topcv import topcv_crawl
from crawls.jobsgo import jobsgo_crawl
from crawls.linkedin import linkedin_crawl

from helpers.helper import vietnam_time_now, is_safe_db_url, is_crawl_time_optimal, estimate_crawl_duration

from database.database import insert_to_db, get_all_category

from scheduler.scheduler import RoundRobinScheduler


def main():
    parser = argparse.ArgumentParser(description="Job crawler with anti-restriction features")
    parser.add_argument(
        "--db-url",
        required=True,
    )
    parser.add_argument("--gha-output", help="Path to GitHub Actions output file")
    parser.add_argument(
        "--min-delay",
        type=float,
        default=2.0,
        help="Minimum delay between requests (seconds)"
    )
    parser.add_argument(
        "--max-delay",
        type=float,
        default=5.0,
        help="Maximum delay between requests (seconds)"
    )
    parser.add_argument(
        "--aggressive",
        action="store_true",
        help="Use aggressive crawling settings (faster but higher risk)"
    )
    parser.add_argument(
        "--pages",
        type=int,
        default=1,
        help="Number of listing pages to crawl per site"
    )

    args = parser.parse_args()

    if not is_safe_db_url(args.db_url):
        exit(1)

    # Adjust delays based on mode
    if args.aggressive:
        print("⚠️  Using aggressive crawling mode - higher risk of blocks!")
        min_delay = 0.5
        max_delay = 2.0
    else:
        min_delay = args.min_delay
        max_delay = args.max_delay
    
    # Check if optimal crawling time
    if is_crawl_time_optimal():
        print("✓ Optimal crawling time (10 PM - 6 AM) - may use slightly faster speeds")
        min_delay *= 0.8
        max_delay *= 0.8
    else:
        print("⚠ Non-optimal time - using conservative speeds to avoid detection")

    # Create shared round-robin scheduler
    # This automatically distributes load across domains
    print(f"\n📊 Initializing scheduler (delay: {min_delay:.1f}s - {max_delay:.1f}s per request)")
    scheduler = RoundRobinScheduler(
        default_min_delay=min_delay,
        default_max_delay=max_delay,
        max_concurrent_per_domain=1,
        session_rotation_interval=50
    )
    
    # Configure per-domain settings (customize based on site tolerance)
    scheduler.configure_domain("itviec.com", min_delay=min_delay, max_delay=max_delay, max_retries=3)
    scheduler.configure_domain("topcv.vn", min_delay=min_delay * 1.2, max_delay=max_delay * 1.2, max_retries=4)
    scheduler.configure_domain("jobsgo.vn", min_delay=min_delay, max_delay=max_delay, max_retries=3)
    scheduler.configure_domain("linkedin.com", min_delay=min_delay * 1.5, max_delay=max_delay * 1.5, max_retries=2)

    # Estimate total time
    total_pages = args.pages  # pages per site
    num_domains = 4
    avg_delay = (min_delay + max_delay) / 2
    estimated_duration = estimate_crawl_duration(total_pages * num_domains, avg_delay, num_domains)
    print(f"⏱️  Estimated crawl duration: ~{estimated_duration}\n")

    categories = get_all_category(args.db_url)

    # Crawl all sites - scheduler automatically does round-robin across domains
    print("=" * 60)
    print("🔄 Starting ITViec crawl")
    print("=" * 60)
    itviec_companies = itviec_crawl(pages=args.pages)
    itviec_job_inserted = insert_to_db(args.db_url, itviec_companies)
    print(f"✓ ITViec: {itviec_job_inserted} jobs inserted\n")

    print("=" * 60)
    print("🔄 Starting LinkedIn crawl")
    print("=" * 60)
    linkedin_companies = linkedin_crawl(categories, pages=args.pages)
    linkedin_job_inserted = insert_to_db(args.db_url, linkedin_companies)
    print(f"✓ LinkedIn: {linkedin_job_inserted} jobs inserted\n")

    print("=" * 60)
    print("🔄 Starting TopCV crawl")
    print("=" * 60)
    topcv_companies = topcv_crawl(pages=args.pages)
    topcv_job_inserted = insert_to_db(args.db_url, topcv_companies)
    print(f"✓ TopCV: {topcv_job_inserted} jobs inserted\n")

    print("=" * 60)
    print("🔄 Starting JobsGO crawl")
    print("=" * 60)
    jobsgo_companies = jobsgo_crawl(pages=args.pages)
    jobsgo_job_inserted = insert_to_db(args.db_url, jobsgo_companies)
    print(f"✓ JobsGO: {jobsgo_job_inserted} jobs inserted\n")

    # Print final statistics
    print("=" * 60)
    print("📈 Crawl Summary")
    print("=" * 60)
    scheduler._print_stats()
    
    total_jobs = itviec_job_inserted + linkedin_job_inserted + topcv_job_inserted + jobsgo_job_inserted
    print(f"\n✅ Total jobs inserted: {total_jobs}")
    print(f"   - ITViec: {itviec_job_inserted}")
    print(f"   - LinkedIn: {linkedin_job_inserted}")
    print(f"   - TopCV: {topcv_job_inserted}")
    print(f"   - JobsGO: {jobsgo_job_inserted}")
    print(f"\n🕐 Completed at: {vietnam_time_now()}")

    if args.gha_output:
        with open(args.gha_output, "a") as f:
            f.write(f"itviec={itviec_job_inserted}\n")
            f.write(f"topcv={topcv_job_inserted}\n")
            f.write(f"jobsgo={jobsgo_job_inserted}\n")
            f.write(f"linkedin={linkedin_job_inserted}\n")
            f.write(f"total={total_jobs}\n")
            f.write(f"crawl_time={vietnam_time_now()}\n")


if __name__ == "__main__":
    main()