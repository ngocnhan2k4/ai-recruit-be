import argparse

from crawlers.itviec import itviec_crawl
from crawlers.linkedin import linkedin_crawl
from crawlers.jobsgo import jobsgo_crawl
from crawlers.topcv import topcv_crawl

from database.connection import insert_to_db
from helpers.security import is_safe_db_url
from helpers.date import vietnam_time_now


def main():
    parser = argparse.ArgumentParser(
        description="Job crawler with anti-restriction features"
    )
    parser.add_argument(
        "--db-url",
        required=True,
    )
    parser.add_argument("--gha-output", help="Path to GitHub Actions output file")
    parser.add_argument(
        "--pages", type=int, default=1, help="Number of listing pages to crawl per site"
    )
    parser.add_argument(
        "--linkedin-keywords",
        type=str,
        default="Web Development",
        help="Keywords to search for on LinkedIn (default: Web Development)",
    )

    args = parser.parse_args()

    if not is_safe_db_url(args.db_url):
        exit(1)

    total_itviec_jobs = 0
    total_linkedin_jobs = 0
    total_topcv_jobs = 0
    total_jobsgo_jobs = 0

    for page in range(1, args.pages + 1):
        print(f"\n{'=' * 60}")
        print(f"📄 Round {page}/{args.pages}")
        print(f"{'=' * 60}\n")

        # # ITViec - page by page
        print(f"🔄 ITViec (page {page})")
        itviec_companies = itviec_crawl(pages=1, start_page=page)
        itviec_inserted = insert_to_db(args.db_url, itviec_companies) or 0
        total_itviec_jobs += itviec_inserted
        print(f"✓ ITViec page {page}: {itviec_inserted} jobs inserted\n")

        # LinkedIn - page by page
        print(f"🔄 LinkedIn (page {page}) - Keywords: {args.linkedin_keywords}")
        linkedin_companies = linkedin_crawl(
            pages=1,
            start_page=page - 1,
            keywords=args.linkedin_keywords,
        )
        linkedin_inserted = insert_to_db(args.db_url, linkedin_companies)
        total_linkedin_jobs += linkedin_inserted
        print(f"✓ LinkedIn page {page}: {linkedin_inserted} jobs inserted\n")

        # # TopCV - page by page (max 10 jobs per page)
        print(f"🔄 TopCV (page {page}, max 10 jobs)")
        topcv_companies = topcv_crawl(pages=1, start_page=page, max_jobs_per_page=10)
        topcv_inserted = insert_to_db(args.db_url, topcv_companies)
        total_topcv_jobs += topcv_inserted
        print(f"✓ TopCV page {page}: {topcv_inserted} jobs inserted\n")

        # # JobsGO - page by page
        print(f"🔄 JobsGO (page {page})")
        jobsgo_companies = jobsgo_crawl(pages=1, start_page=page)
        jobsgo_inserted = insert_to_db(args.db_url, jobsgo_companies)
        total_jobsgo_jobs += jobsgo_inserted
        print(f"✓ JobsGO page {page}: {jobsgo_inserted} jobs inserted\n")

        print(f"Round {page} summary: {itviec_inserted + linkedin_inserted + topcv_inserted + jobsgo_inserted} jobs inserted")

    total_jobs = (
        total_itviec_jobs + total_linkedin_jobs + total_topcv_jobs + total_jobsgo_jobs
    )
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
