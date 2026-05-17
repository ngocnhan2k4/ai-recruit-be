import argparse
import os
import sys
from urllib.parse import unquote, urlparse

import psycopg2

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from job_index_queue.producer import JobIndexQueueProducer, QueueConfig


def delete_other_category_jobs(db_url: str, redis_url: str = None) -> int:
    """
    Delete all jobs with 'Other' category and their dependent records.
    Also enqueue deleted jobs to clear search indexes.
    Returns the number of jobs deleted.
    """
    print("🗑️ Deleting jobs with 'Other' category...")
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    try:
        # Create a temporary list of Job IDs to delete
        cur.execute("""
            CREATE TEMP TABLE jobs_to_delete AS
            SELECT j.id
            FROM jobs j
            JOIN categories c ON j.category_id = c.id
            WHERE c.name = 'Other';
        """)

        # Fetch IDs before deleting to enqueue them for search index removal
        cur.execute("SELECT id FROM jobs_to_delete;")
        jobs_to_delete_ids = [str(row[0]) for row in cur.fetchall()]
        count = len(jobs_to_delete_ids)
        print(f"📊 Found {count} jobs with 'Other' category to delete")

        if count > 0:
            # Delete from dependent tables first
            cur.execute(
                "DELETE FROM job_skills WHERE job_id IN (SELECT id FROM jobs_to_delete);"
            )
            cur.execute(
                "DELETE FROM job_provinces WHERE job_id IN (SELECT id FROM jobs_to_delete);"
            )
            cur.execute(
                "DELETE FROM apply_jobs WHERE job_id IN (SELECT id FROM jobs_to_delete);"
            )
            cur.execute(
                "DELETE FROM user_interactions WHERE job_id IN (SELECT id FROM jobs_to_delete);"
            )

            # Finally, delete the jobs
            cur.execute("DELETE FROM jobs WHERE id IN (SELECT id FROM jobs_to_delete);")

        cur.execute("DROP TABLE jobs_to_delete;")
        conn.commit()

        print(f"✅ Deleted {count} jobs with 'Other' category")

        # Enqueue deleted jobs to search index remover (using upsert/delete Queue script wrapper)
        if redis_url and count > 0:
            try:
                parsed = urlparse(redis_url)
                redis_password = unquote(parsed.password) if parsed.password else None
                producer = JobIndexQueueProducer(
                    QueueConfig(
                        redis_host=parsed.hostname,
                        redis_port=parsed.port or 6379,
                        redis_password=redis_password,
                        redis_db=0,
                        event_name="delete.job",
                    )
                )
                queued_count = producer.enqueue_upsert_jobs(jobs_to_delete_ids)
                print(f"📡 Enqueued {queued_count} deleted jobs to clear search index.")
            except Exception as e:
                print(f"⚠️ Failed to enqueue deleted jobs: {e}")

        return count

    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Delete jobs with 'Other' category from database and clear index"
    )

    parser.add_argument(
        "--db_url",
        type=str,
        required=True,
        help="PostgreSQL Connection URL",
    )
    parser.add_argument(
        "--redis_url", type=str, default=None, help="Redis URL to enqueue indices"
    )

    args = parser.parse_args()
    delete_other_category_jobs(args.db_url, args.redis_url)
