import argparse

from crawls.itviec import itviec_crawl
from crawls.topcv import topcv_crawl
from crawls.jobsgo import jobsgo_crawl
from crawls.linkedin import linkedin_crawl

from crawl_jobs.helpers.helper import vietnam_time_now, is_safe_db_url

from crawl_jobs.database.database import insert_to_db, get_all_category


def main():
    parser = argparse.ArgumentParser(description="Job crawler")
    parser.add_argument(
        "--db-url",
        required=True,
    )
    parser.add_argument("--gha-output", help="Path to GitHub Actions output file")

    args = parser.parse_args()

    if not is_safe_db_url(args.db_url):
        exit(1)

    categories = get_all_category(args.db_url)

    itviec_companies = itviec_crawl()
    itviec_job_inserted = insert_to_db(args.db_url, itviec_companies)

    linkedin_companies = linkedin_crawl(categories)
    linkedin_job_inserted = insert_to_db(args.db_url, linkedin_companies)

    topcv_companies = topcv_crawl()
    topcv_job_inserted = insert_to_db(args.db_url, topcv_companies)

    jobsgo_companies = jobsgo_crawl()
    jobsgo_job_inserted = insert_to_db(args.db_url, jobsgo_companies)

    if args.gha_output:
        with open(args.gha_output, "a") as f:
            f.write(f"itviec={itviec_job_inserted}\n")
            f.write(f"topcv={topcv_job_inserted}\n")
            f.write(f"jobsgo={jobsgo_job_inserted}\n")
            f.write(f"linkedin={linkedin_job_inserted}\n")
            f.write(f"crawl_time={vietnam_time_now()}\n")


if __name__ == "__main__":
    main()