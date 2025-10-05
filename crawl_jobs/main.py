import argparse
from datetime import datetime, timezone, timedelta

from crawls.itviec import itviec_crawl
from crawls.topcv import topcv_crawl
from crawls.jobsgo import jobsgo_crawl
from crawls.linkedin import linkedin_crawl

from database import insert_to_db


def vietnam_time_now():
    vn_tz = timezone(timedelta(hours=7))
    return datetime.now(vn_tz).strftime("%Y-%m-%d %H:%M:%S")


def main():
    linkedin_crawl()

    # parser = argparse.ArgumentParser(description="Job crawler")
    # parser.add_argument(
    #     "--db-url",
    #     required=True,
    #     help="Postgres connection string, e.g. postgres://postgres:123456@localhost:5432/mydb",
    # )
    # parser.add_argument("--gha-output", help="Path to GitHub Actions output file")

    # args = parser.parse_args()

    # itviec_companies = itviec_crawl()
    # itviec_job_inserted = insert_to_db(args.db_url, itviec_companies)

    # topcv_companies = topcv_crawl()
    # topcv_job_inserted = insert_to_db(args.db_url, topcv_companies)

    # jobsgo_companies = jobsgo_crawl()
    # jobsgo_job_inserted = insert_to_db(args.db_url, jobsgo_companies)

    # if args.gha_output:
    #     with open(args.gha_output, "a") as f:
    #         f.write(f"itviec={itviec_job_inserted}\n")
    #         f.write(f"topcv={topcv_job_inserted}\n")
    #         f.write(f"jobsgo={jobsgo_job_inserted}\n")
    #         f.write(f"crawl_time={vietnam_time_now()}\n")


if __name__ == "__main__":
    main()