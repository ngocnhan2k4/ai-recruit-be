from crawl import crawl_jobs
from config import CONFIG
from database import insert_to_db
from helpers import extract_employees

def main():
    jobs = crawl_jobs()

    insert_to_db(CONFIG.db_url, jobs)


if __name__ == "__main__":
    main()