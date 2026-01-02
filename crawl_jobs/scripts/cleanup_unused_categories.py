import argparse

import psycopg2


def cleanup_unused_categories(db_url: str) -> int:
    """
    Delete categories that are not referenced by any jobs.
    Returns the number of categories deleted.
    """
    delete_query = """
    DELETE FROM public.categories
    WHERE NOT EXISTS (
        SELECT 1
        FROM public.jobs
        WHERE public.jobs.category_id = public.categories.id
    );
    """

    print("🧹 Cleaning up unused categories...")
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    try:
        cur.execute(delete_query)
        deleted_count = cur.rowcount
        conn.commit()

        print(f"✅ Deleted {deleted_count} unused categories")
        return deleted_count

    except Exception as e:
        conn.rollback()
        print(f"❌ Error occurred: {e}")
        raise

    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Delete unused categories from database"
    )

    parser.add_argument(
        "--db_url",
        type=str,
        required=True,
        help="PostgreSQL Connection URL",
    )

    args = parser.parse_args()
    cleanup_unused_categories(args.db_url)
