import argparse

from crawlers.itviec import itviec_crawl
from crawlers.linkedin import linkedin_crawl
from crawlers.jobsgo import jobsgo_crawl
from crawlers.topcv import topcv_crawl
from crawlers.vietnamworks import vietnamworks_crawl

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
    
    # Global pages option (can be overridden by individual options)
    parser.add_argument(
        "--pages", type=int, default=1, 
        help="Default number of pages to crawl per site (can be overridden by individual options)"
    )
    
    # Individual page options for each crawler
    parser.add_argument(
        "--itviec-pages", type=int, default=None,
        help="Number of pages to crawl for ITViec (default: uses --pages value)"
    )
    parser.add_argument(
        "--linkedin-pages", type=int, default=None,
        help="Number of pages to crawl for LinkedIn (default: uses --pages value)"
    )
    parser.add_argument(
        "--topcv-pages", type=int, default=None,
        help="Number of pages to crawl for TopCV (default: uses --pages value)"
    )
    parser.add_argument(
        "--jobsgo-pages", type=int, default=None,
        help="Number of pages to crawl for JobsGO (default: uses --pages value)"
    )
    parser.add_argument(
        "--vietnamworks-pages", type=int, default=None,
        help="Number of pages to crawl for VietnamWorks (default: uses --pages value)"
    )
    
    parser.add_argument(
        "--linkedin-keywords",
        type=str,
        default="Web Development",
        help="Keywords to search for on LinkedIn (default: Web Development)",
    )
    parser.add_argument(
        "--mode",
        type=str,
        choices=["skip", "update"],
        default="skip",
        help="Mode for existing jobs: 'skip' (default) or 'update' to update existing jobs with new data",
    )

    args = parser.parse_args()

    if not is_safe_db_url(args.db_url):
        exit(1)

    update_mode = args.mode == "update"
    
    itviec_pages = args.itviec_pages or args.pages
    linkedin_pages = args.linkedin_pages or args.pages
    topcv_pages = args.topcv_pages or args.pages
    jobsgo_pages = args.jobsgo_pages or args.pages
    vietnamworks_pages = args.vietnamworks_pages or args.pages
    
    # Track statistics per source
    stats = {
        "itviec": {"inserted": 0, "updated": 0, "skipped": 0},
        "linkedin": {"inserted": 0, "updated": 0, "skipped": 0},
        "topcv": {"inserted": 0, "updated": 0, "skipped": 0},
        "jobsgo": {"inserted": 0, "updated": 0, "skipped": 0},
        "vietnamworks": {"inserted": 0, "updated": 0, "skipped": 0},
    }

    print(f"\n🚀 Job Crawler Started")
    print(f"   Mode: {'UPDATE existing jobs' if update_mode else 'SKIP existing jobs'}")
    print(f"   Pages: ITViec={itviec_pages}, LinkedIn={linkedin_pages}, TopCV={topcv_pages}, JobsGO={jobsgo_pages}, VietnamWorks={vietnamworks_pages}")

    # Calculate max pages to iterate
    max_pages = max(itviec_pages, linkedin_pages, topcv_pages, jobsgo_pages, vietnamworks_pages)

    for page in range(1, max_pages + 1):
        print(f"\n{'=' * 60}")
        print(f"📄 Round {page}/{max_pages}")
        print(f"{'=' * 60}")

        # ITViec - page by page
        if page <= itviec_pages:
            print(f"\n🔄 ITViec (page {page}/{itviec_pages})")
            itviec_companies = itviec_crawl(pages=1, start_page=page)
            result = insert_to_db(args.db_url, itviec_companies, update_mode=update_mode) or {}
            if isinstance(result, dict):
                for key in stats["itviec"]:
                    stats["itviec"][key] += result.get(key, 0)

        # LinkedIn - page by page
        if page <= linkedin_pages:
            print(f"\n🔄 LinkedIn (page {page}/{linkedin_pages}) - Keywords: {args.linkedin_keywords}")
            linkedin_companies = linkedin_crawl(
                pages=1,
                start_page=page - 1,
                keywords=args.linkedin_keywords,
            )
            result = insert_to_db(args.db_url, linkedin_companies, update_mode=update_mode) or {}
            if isinstance(result, dict):
                for key in stats["linkedin"]:
                    stats["linkedin"][key] += result.get(key, 0)

        # TopCV - page by page (max 10 jobs per page)
        if page <= topcv_pages:
            print(f"\n🔄 TopCV (page {page}/{topcv_pages}, max 10 jobs)")
            topcv_companies = topcv_crawl(pages=1, start_page=page, max_jobs_per_page=10)
            result = insert_to_db(args.db_url, topcv_companies, update_mode=update_mode) or {}
            if isinstance(result, dict):
                for key in stats["topcv"]:
                    stats["topcv"][key] += result.get(key, 0)

        # JobsGO - page by page
        if page <= jobsgo_pages:
            print(f"\n🔄 JobsGO (page {page}/{jobsgo_pages})")
            jobsgo_companies = jobsgo_crawl(pages=1, start_page=page)
            result = insert_to_db(args.db_url, jobsgo_companies, update_mode=update_mode) or {}
            if isinstance(result, dict):
                for key in stats["jobsgo"]:
                    stats["jobsgo"][key] += result.get(key, 0)

        # VietnamWorks - page by page
        if page <= vietnamworks_pages:
            print(f"\n🔄 VietnamWorks (page {page}/{vietnamworks_pages})")
            vietnamworks_companies = vietnamworks_crawl(pages=1, start_page=page)
            result = insert_to_db(args.db_url, vietnamworks_companies, update_mode=update_mode) or {}
            if isinstance(result, dict):
                for key in stats["vietnamworks"]:
                    stats["vietnamworks"][key] += result.get(key, 0)

    # Calculate totals
    total_inserted = sum(s["inserted"] for s in stats.values())
    total_updated = sum(s["updated"] for s in stats.values())
    total_skipped = sum(s["skipped"] for s in stats.values())
    total_processed = total_inserted + total_updated

    print(f"\n{'=' * 60}")
    print(f"📊 FINAL SUMMARY")
    print(f"{'=' * 60}")
    print(f"\n✅ Total processed: {total_processed} jobs")
    print(f"   ✓ Inserted: {total_inserted}")
    print(f"   ↻ Updated: {total_updated}")
    print(f"   ⊘ Skipped: {total_skipped}")
    
    print(f"\n📈 By Source:")
    for source, s in stats.items():
        total = s["inserted"] + s["updated"]
        print(f"   - {source.capitalize()}: {total} ({s['inserted']} new, {s['updated']} updated, {s['skipped']} skipped)")
    
    print(f"\n🕐 Completed at: {vietnam_time_now()}")

    if args.gha_output:
        with open(args.gha_output, "a") as f:
            f.write(f"itviec={stats['itviec']['inserted'] + stats['itviec']['updated']}\n")
            f.write(f"topcv={stats['topcv']['inserted'] + stats['topcv']['updated']}\n")
            f.write(f"jobsgo={stats['jobsgo']['inserted'] + stats['jobsgo']['updated']}\n")
            f.write(f"linkedin={stats['linkedin']['inserted'] + stats['linkedin']['updated']}\n")
            f.write(f"vietnamworks={stats['vietnamworks']['inserted'] + stats['vietnamworks']['updated']}\n")
            f.write(f"total_inserted={total_inserted}\n")
            f.write(f"total_updated={total_updated}\n")
            f.write(f"total={total_processed}\n")
            f.write(f"crawl_time={vietnam_time_now()}\n")


if __name__ == "__main__":
    main()
