import argparse
import os
import sys
from urllib.parse import unquote, urlparse

import pandas as pd
import psycopg2

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from job_index_queue.producer import JobIndexQueueProducer, QueueConfig


def get_or_create_category_id(cur, category_name):
    """
    1. Checks if the category name exists in the 'categories' table.
    2. If yes, returns its UUID.
    3. If no, inserts it and returns the new UUID.
    """
    cur.execute("SELECT id FROM categories WHERE name = %s", (category_name,))
    result = cur.fetchone()

    if result:
        return result[0]
    else:
        print(f"   + Creating new category: {category_name}")
        cur.execute(
            "INSERT INTO categories (name) VALUES (%s) RETURNING id", (category_name,)
        )
        new_id = cur.fetchone()[0]
        return new_id


def update_database(db_url, csv_file, redis_url=None):
    print(f"Loading {csv_file}...")
    try:
        df = pd.read_csv(csv_file)
    except FileNotFoundError:
        print(f"Error: {csv_file} not found.")
        return

    print("Connecting to PostgreSQL...")
    conn = None
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()

        print(f"Processing {len(df)} jobs...")
        success_count = 0
        updated_job_ids = []

        for _, row in df.iterrows():
            job_id = row["id"]
            predicted_cat = row["predicted_category"]

            if pd.isna(job_id) or pd.isna(predicted_cat):
                continue

            category_id = get_or_create_category_id(cur, predicted_cat)

            cur.execute(
                "UPDATE jobs SET category_id = %s WHERE id = %s",
                (category_id, job_id),
            )

            success_count += 1
            updated_job_ids.append(str(job_id))

            if success_count % 100 == 0:
                print(f"   ...processed {success_count} rows")

        conn.commit()
        print("=" * 40)
        print(f"✅ Success! Updated categories for {success_count} jobs.")

        # Enqueue to Redis Job Index
        if redis_url and updated_job_ids:
            try:
                parsed = urlparse(redis_url)
                redis_password = unquote(parsed.password) if parsed.password else None
                producer = JobIndexQueueProducer(
                    QueueConfig(
                        redis_host=parsed.hostname,
                        redis_port=parsed.port or 6379,
                        redis_password=redis_password,
                        redis_db=0,
                        event_name="upsert.job",
                    )
                )
                queued_count = producer.enqueue_upsert_jobs(updated_job_ids)
                print(f"📡 Enqueued {queued_count} updated jobs to search index.")
            except Exception as e:
                print(f"⚠️ Failed to enqueue jobs: {e}")

        print("=" * 40)

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"❌ Database error: {e}")
    finally:
        if conn:
            cur.close()
            conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Update Job Categories in Database")

    parser.add_argument(
        "--db_url", type=str, required=True, help="PostgreSQL Connection URL"
    )
    parser.add_argument(
        "--csv_file",
        type=str,
        default="../classifier/data/results.csv",
        help="Path to the CSV file",
    )
    parser.add_argument(
        "--redis_url", type=str, default=None, help="Redis URL to enqueue indices"
    )

    args = parser.parse_args()

    update_database(args.db_url, args.csv_file, args.redis_url)
