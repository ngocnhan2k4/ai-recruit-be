import argparse

import psycopg2


def delete_other_category_jobs(db_url: str) -> int:
    """
    Delete all jobs with 'Other' category and their dependent records.
    Returns the number of jobs deleted.
    """
    delete_script = """
    BEGIN;

    -- Create a temporary list of Job IDs to delete
    CREATE TEMP TABLE jobs_to_delete AS
    SELECT j.id
    FROM jobs j
    JOIN categories c ON j.category_id = c.id
    WHERE c.name = 'Other';

    -- Delete from dependent tables first
    DELETE FROM job_skills
    WHERE job_id IN (SELECT id FROM jobs_to_delete);

    DELETE FROM job_provinces
    WHERE job_id IN (SELECT id FROM jobs_to_delete);

    DELETE FROM apply_jobs
    WHERE job_id IN (SELECT id FROM jobs_to_delete);

    DELETE FROM user_interactions
    WHERE job_id IN (SELECT id FROM jobs_to_delete);

    -- Finally, delete the jobs
    DELETE FROM jobs
    WHERE id IN (SELECT id FROM jobs_to_delete);

    -- Drop the temp table and commit
    DROP TABLE jobs_to_delete;
    COMMIT;
    """

    print("🗑️ Deleting jobs with 'Other' category...")
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    try:
        # Count jobs to delete before deletion
        cur.execute(
            """
            SELECT COUNT(*) FROM jobs j
            JOIN categories c ON j.category_id = c.id
            WHERE c.name = 'Other'
            """
        )
        count = cur.fetchone()[0]
        print(f"📊 Found {count} jobs with 'Other' category to delete")

        cur.execute(delete_script)
        conn.commit()

        print(f"✅ Deleted {count} jobs with 'Other' category")
        return count

    except Exception as e:
        conn.rollback()
        print(f"❌ Error occurred: {e}")
        raise

    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Delete jobs with 'Other' category from database"
    )

    parser.add_argument(
        "--db_url",
        type=str,
        required=True,
        help="PostgreSQL Connection URL",
    )

    args = parser.parse_args()
    delete_other_category_jobs(args.db_url)
