from crawl import crawl_jobs
from config import load_config
from database import insert_to_db

def main():
    jobs = crawl_jobs()

    db_url = load_config()

    insert_to_db(db_url, jobs)

if __name__ == "__main__":
    main()