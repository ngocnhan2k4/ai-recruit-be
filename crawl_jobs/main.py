import argparse
from urllib.parse import parse_qs, unquote, urlparse

from crawlers.itviec import itviec_crawl
from crawlers.jobsgo import jobsgo_crawl
from crawlers.linkedin import linkedin_crawl
from crawlers.topcv import topcv_crawl
from crawlers.vietnamworks import vietnamworks_crawl
from database.connection import insert_to_db
from helpers.date import vietnam_time_now
from helpers.security import is_safe_db_url
from job_index_queue import JobIndexQueueProducer, QueueConfig


def parse_redis_url(redis_url: str) -> tuple[str, int, str | None, int]:
    parsed = urlparse(redis_url)
    if parsed.scheme not in {"redis", "rediss"}:
        raise ValueError("--queue-redis-url must start with redis:// or rediss://")

    if not parsed.hostname:
        raise ValueError("--queue-redis-url is missing host")

    password = unquote(parsed.password) if parsed.password else None
    port = parsed.port or 6379

    db = 0
    if parsed.path and parsed.path != "/":
        db = int(parsed.path.lstrip("/"))

    query_db = parse_qs(parsed.query).get("db", [None])[0]
    if query_db is not None and query_db != "":
        db = int(query_db)

    return parsed.hostname, port, password, db


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
        "--pages",
        type=int,
        default=1,
        help="Default number of pages to crawl per site (can be overridden by individual options)",
    )

    # Individual page options for each crawler
    parser.add_argument(
        "--itviec-pages",
        type=int,
        default=None,
        help="Number of pages to crawl for ITViec (default: uses --pages value)",
    )
    parser.add_argument(
        "--linkedin-pages",
        type=int,
        default=None,
        help="Number of pages to crawl for LinkedIn (default: uses --pages value)",
    )
    parser.add_argument(
        "--topcv-pages",
        type=int,
        default=None,
        help="Number of pages to crawl for TopCV (default: uses --pages value)",
    )
    parser.add_argument(
        "--jobsgo-pages",
        type=int,
        default=None,
        help="Number of pages to crawl for JobsGO (default: uses --pages value)",
    )
    parser.add_argument(
        "--vietnamworks-pages",
        type=int,
        default=None,
        help="Number of pages to crawl for VietnamWorks (default: uses --pages value)",
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
    parser.add_argument(
        "--queue-index-enabled",
        action="store_true",
        help="Enable enqueueing job index upsert events to BullMQ",
    )
    parser.add_argument(
        "--queue-redis-url",
        type=str,
        default=None,
        help="Redis URL for job index queue, e.g. redis://:password@host:6379/0",
    )
    parser.add_argument(
        "--queue-redis-host",
        type=str,
        default=None,
        help="Redis host for job index queue",
    )
    parser.add_argument(
        "--queue-redis-port",
        type=int,
        default=None,
        help="Redis port for job index queue",
    )
    parser.add_argument(
        "--queue-redis-password",
        type=str,
        default=None,
        help="Redis password for job index queue",
    )
    parser.add_argument(
        "--queue-redis-db",
        type=int,
        default=None,
        help="Redis DB index for job index queue",
    )
    parser.add_argument(
        "--queue-node-script-path",
        type=str,
        default="job_index_queue/enqueue_job_index.js",
        help="Path to Node.js script that publishes to BullMQ",
    )

    args = parser.parse_args()

    if not is_safe_db_url(args.db_url):
        exit(1)

    update_mode = args.mode == "update"
    queue_producer = None

    if args.queue_index_enabled:
        redis_host = args.queue_redis_host
        redis_port = args.queue_redis_port
        redis_password = args.queue_redis_password
        redis_db = args.queue_redis_db

        if args.queue_redis_url:
            (
                url_host,
                url_port,
                url_password,
                url_db,
            ) = parse_redis_url(args.queue_redis_url)
            redis_host = redis_host or url_host
            redis_port = redis_port if redis_port is not None else url_port
            redis_password = (
                redis_password if redis_password is not None else url_password
            )
            redis_db = redis_db if redis_db is not None else url_db

        if not redis_host:
            raise ValueError(
                "Provide --queue-redis-url or --queue-redis-host when --queue-index-enabled is set"
            )

        queue_producer = JobIndexQueueProducer(
            QueueConfig(
                redis_host=redis_host,
                redis_port=redis_port if redis_port is not None else 6379,
                redis_password=redis_password,
                redis_db=redis_db if redis_db is not None else 0,
                node_script_path=args.queue_node_script_path,
            )
        )

    # Handle page counts explicitly (allow 0 to skip)
    def get_pages(val):
        return val if val is not None else args.pages

    itviec_pages = get_pages(args.itviec_pages)
    linkedin_pages = get_pages(args.linkedin_pages)
    topcv_pages = get_pages(args.topcv_pages)
    jobsgo_pages = get_pages(args.jobsgo_pages)
    vietnamworks_pages = get_pages(args.vietnamworks_pages)

    # Track statistics per source
    stats = {
        "itviec": {"inserted": 0, "updated": 0, "skipped": 0},
        "linkedin": {"inserted": 0, "updated": 0, "skipped": 0},
        "topcv": {"inserted": 0, "updated": 0, "skipped": 0},
        "jobsgo": {"inserted": 0, "updated": 0, "skipped": 0},
        "vietnamworks": {"inserted": 0, "updated": 0, "skipped": 0},
    }

    print("\n🚀 Job Crawler Started")
    print(f"   Mode: {'UPDATE existing jobs' if update_mode else 'SKIP existing jobs'}")
    print(
        f"   Pages: ITViec={itviec_pages}, LinkedIn={linkedin_pages}, TopCV={topcv_pages}, JobsGO={jobsgo_pages}, VietnamWorks={vietnamworks_pages}"
    )
    print(f"   Queue index: {'ENABLED' if queue_producer else 'DISABLED'}")

    total_queue_enqueued = 0
    total_queue_failed = 0

    # Calculate max pages to iterate
    max_pages = max(
        itviec_pages, linkedin_pages, topcv_pages, jobsgo_pages, vietnamworks_pages
    )

    for page in range(1, max_pages + 1):
        print(f"\n{'=' * 60}")
        print(f"📄 Round {page}/{max_pages}")
        print(f"{'=' * 60}")

        # ITViec - page by page
        if page <= itviec_pages:
            print(f"\n🔄 ITViec (page {page}/{itviec_pages})")
            itviec_companies = itviec_crawl(pages=1, start_page=page)
            result = (
                insert_to_db(
                    args.db_url,
                    itviec_companies,
                    update_mode=update_mode,
                    index_queue_producer=queue_producer,
                )
                or {}
            )
            if isinstance(result, dict):
                for key in stats["itviec"]:
                    stats["itviec"][key] += result.get(key, 0)
                total_queue_enqueued += result.get("queue_enqueued", 0)
                total_queue_failed += result.get("queue_failed", 0)

        # LinkedIn - page by page
        if page <= linkedin_pages:
            print(
                f"\n🔄 LinkedIn (page {page}/{linkedin_pages}) - Keywords: {args.linkedin_keywords}"
            )
            linkedin_companies = linkedin_crawl(
                pages=1,
                start_page=page - 1,
                keywords=args.linkedin_keywords,
            )
            result = (
                insert_to_db(
                    args.db_url,
                    linkedin_companies,
                    update_mode=update_mode,
                    index_queue_producer=queue_producer,
                )
                or {}
            )
            if isinstance(result, dict):
                for key in stats["linkedin"]:
                    stats["linkedin"][key] += result.get(key, 0)
                total_queue_enqueued += result.get("queue_enqueued", 0)
                total_queue_failed += result.get("queue_failed", 0)

        # TopCV - page by page (max 10 jobs per page)
        if page <= topcv_pages:
            print(f"\n🔄 TopCV (page {page}/{topcv_pages}, max 10 jobs)")
            topcv_companies = topcv_crawl(
                pages=1, start_page=page, max_jobs_per_page=10
            )
            result = (
                insert_to_db(
                    args.db_url,
                    topcv_companies,
                    update_mode=update_mode,
                    index_queue_producer=queue_producer,
                )
                or {}
            )
            if isinstance(result, dict):
                for key in stats["topcv"]:
                    stats["topcv"][key] += result.get(key, 0)
                total_queue_enqueued += result.get("queue_enqueued", 0)
                total_queue_failed += result.get("queue_failed", 0)

        # JobsGO - page by page
        if page <= jobsgo_pages:
            print(f"\n🔄 JobsGO (page {page}/{jobsgo_pages})")
            jobsgo_companies = jobsgo_crawl(pages=1, start_page=page)
            result = (
                insert_to_db(
                    args.db_url,
                    jobsgo_companies,
                    update_mode=update_mode,
                    index_queue_producer=queue_producer,
                )
                or {}
            )
            if isinstance(result, dict):
                for key in stats["jobsgo"]:
                    stats["jobsgo"][key] += result.get(key, 0)
                total_queue_enqueued += result.get("queue_enqueued", 0)
                total_queue_failed += result.get("queue_failed", 0)

        # VietnamWorks - page by page
        if page <= vietnamworks_pages:
            print(f"\n🔄 VietnamWorks (page {page}/{vietnamworks_pages})")
            vietnamworks_companies = vietnamworks_crawl(pages=1, start_page=page)
            result = (
                insert_to_db(
                    args.db_url,
                    vietnamworks_companies,
                    update_mode=update_mode,
                    index_queue_producer=queue_producer,
                )
                or {}
            )
            if isinstance(result, dict):
                for key in stats["vietnamworks"]:
                    stats["vietnamworks"][key] += result.get(key, 0)
                total_queue_enqueued += result.get("queue_enqueued", 0)
                total_queue_failed += result.get("queue_failed", 0)

    # Calculate totals
    total_inserted = sum(s["inserted"] for s in stats.values())
    total_updated = sum(s["updated"] for s in stats.values())
    total_skipped = sum(s["skipped"] for s in stats.values())
    total_processed = total_inserted + total_updated

    print(f"\n{'=' * 60}")
    print("📊 FINAL SUMMARY")
    print(f"{'=' * 60}")
    print(f"\n✅ Total processed: {total_processed} jobs")
    print(f"   ✓ Inserted: {total_inserted}")
    print(f"   ↻ Updated: {total_updated}")
    print(f"   ⊘ Skipped: {total_skipped}")
    if queue_producer:
        print(f"   📨 Queue enqueued: {total_queue_enqueued}")
        print(f"   ⚠ Queue failed: {total_queue_failed}")

    print("\n📈 By Source:")
    for source, s in stats.items():
        total = s["inserted"] + s["updated"]
        print(
            f"   - {source.capitalize()}: {total} ({s['inserted']} new, {s['updated']} updated, {s['skipped']} skipped)"
        )

    print(f"\n🕐 Completed at: {vietnam_time_now()}")

    if args.gha_output:
        with open(args.gha_output, "a") as f:
            f.write(
                f"itviec={stats['itviec']['inserted'] + stats['itviec']['updated']}\n"
            )
            f.write(f"topcv={stats['topcv']['inserted'] + stats['topcv']['updated']}\n")
            f.write(
                f"jobsgo={stats['jobsgo']['inserted'] + stats['jobsgo']['updated']}\n"
            )
            f.write(
                f"linkedin={stats['linkedin']['inserted'] + stats['linkedin']['updated']}\n"
            )
            f.write(
                f"vietnamworks={stats['vietnamworks']['inserted'] + stats['vietnamworks']['updated']}\n"
            )
            f.write(f"total_inserted={total_inserted}\n")
            f.write(f"total_updated={total_updated}\n")
            f.write(f"total_queue_enqueued={total_queue_enqueued}\n")
            f.write(f"total_queue_failed={total_queue_failed}\n")
            f.write(f"total={total_processed}\n")
            f.write(f"crawl_time={vietnam_time_now()}\n")


if __name__ == "__main__":
    main()
