import argparse

from crawlers.itviec import itviec_crawl
from crawlers.topcv import topcv_crawl
from crawlers.jobsgo import jobsgo_crawl
from crawlers.linkedin import linkedin_crawl

from helpers.helper import vietnam_time_now, is_safe_db_url, is_crawl_time_optimal, estimate_crawl_duration

from crawl_jobs.database.connection import insert_to_db

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
    parser.add_argument(
        "--linkedin-keywords",
        type=str,
        default="Web Development",
        help="Keywords to search for on LinkedIn (default: Web Development)"
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
    print(f"\n📊 Initializing scheduler (delay: {min_delay:.1f}s - {max_delay:.1f}s per request)")
    scheduler = RoundRobinScheduler(
        default_min_delay=min_delay,
        default_max_delay=max_delay,
        max_concurrent_per_domain=1,
        session_rotation_interval=50
    )
    
    # Configure per-domain setting
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

    # Round-robin crawling: crawl 1 page from each site, insert, repeat
    print("=" * 60)
    print("🔄 Starting Round-Robin Crawl (page-by-page across all sites)")
    print("=" * 60)
    
    total_itviec_jobs = 0
    total_linkedin_jobs = 0
    total_topcv_jobs = 0
    total_jobsgo_jobs = 0

    for page in range(1, args.pages + 1):
        print(f"\n{'='*60}")
        print(f"📄 Round {page}/{args.pages}")
        print(f"{'='*60}\n")

        # # ITViec - page by page
        # print(f"🔄 ITViec (page {page})")
        # itviec_companies = itviec_crawl(pages=1, start_page=page, use_enhanced=True, scheduler=scheduler)
        # itviec_inserted = insert_to_db(args.db_url, itviec_companies) or 0
        # total_itviec_jobs += itviec_inserted
        # print(f"✓ ITViec page {page}: {itviec_inserted} jobs inserted\n")

        # LinkedIn - page by page
        print(f"🔄 LinkedIn (page {page}) - Keywords: {args.linkedin_keywords}")
        linkedin_companies = linkedin_crawl(pages=1, start_page=page-1, scheduler=scheduler, keywords=args.linkedin_keywords)
        linkedin_inserted = insert_to_db(args.db_url, linkedin_companies)
        total_linkedin_jobs += linkedin_inserted
        print(f"✓ LinkedIn page {page}: {linkedin_inserted} jobs inserted\n")

        # # TopCV - page by page (max 10 jobs per page)
        # print(f"🔄 TopCV (page {page}, max 10 jobs)")
        # topcv_companies = topcv_crawl(pages=1, start_page=page, max_jobs_per_page=10, scheduler=scheduler)
        # topcv_inserted = insert_to_db(args.db_url, topcv_companies)
        # total_topcv_jobs += topcv_inserted
        # print(f"✓ TopCV page {page}: {topcv_inserted} jobs inserted\n")

        # # JobsGO - page by page
        # print(f"🔄 JobsGO (page {page})")
        # jobsgo_companies = jobsgo_crawl(pages=1, start_page=page, scheduler=scheduler)
        # jobsgo_inserted = insert_to_db(args.db_url, jobsgo_companies)
        # total_jobsgo_jobs += jobsgo_inserted
        # print(f"✓ JobsGO page {page}: {jobsgo_inserted} jobs inserted\n")

        # print(f"Round {page} summary: {itviec_inserted + linkedin_inserted + topcv_inserted + jobsgo_inserted} jobs inserted")

    # Print final statistics
    print("\n" + "=" * 60)
    print("📈 Crawl Summary")
    print("=" * 60)
    scheduler._print_stats()
    
    total_jobs = total_itviec_jobs + total_linkedin_jobs + total_topcv_jobs + total_jobsgo_jobs
    print(f"\n✅ Total jobs inserted: {total_jobs}")
    print(f"   - ITViec: {total_itviec_jobs}")
    print(f"   - LinkedIn: {total_linkedin_jobs}")
    print(f"   - TopCV: {total_topcv_jobs} (10 jobs/page limit)")
    print(f"   - JobsGO: {total_jobsgo_jobs}")
    print(f"\n🕐 Completed at: {vietnam_time_now()}")

    if args.gha_output:
        with open(args.gha_output, "a") as f:
            f.write(f"itviec={total_itviec_jobs}\n")
            f.write(f"topcv={total_topcv_jobs}\n")
            f.write(f"jobsgo={total_jobsgo_jobs}\n")
            f.write(f"linkedin={total_linkedin_jobs}\n")
            f.write(f"total={total_jobs}\n")
            f.write(f"crawl_time={vietnam_time_now()}\n")


if __name__ == "__main__":
    main()