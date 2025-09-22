import psycopg2
from psycopg2.extras import Json
from datetime import datetime, timezone

def insert_to_db(db_url: str, companies: dict):
    """
    Insert companies and their jobs into Postgres without changing schema.
    Uses SELECT to avoid duplicates.
    """
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()

        for name, cdata in companies.items():
            # ensure Python list or None for address
            addresses = cdata.get("locations") or []

            # --- Check if company exists ---
            cur.execute("SELECT id FROM company_raws WHERE name = %s LIMIT 1", (name,))
            row = cur.fetchone()

            if row:
                company_id = row[0]
                cur.execute(
                    "UPDATE company_raws SET crawled_at = %s WHERE id = %s",
                    (cdata.get("crawled_at", datetime.now(timezone.utc)), company_id),
                )
            else:
                cur.execute(
                    """
                    INSERT INTO company_raws
                        (name, logo_url, description, address,
                         employees, website_url, source, crawled_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (
                        name,
                        cdata.get("logo"),
                        cdata.get("description"),
                        addresses,
                        cdata.get("company_size"),
                        cdata.get("website_url"),
                        cdata.get("source", "itviec"),
                        cdata.get("crawled_at", datetime.now(timezone.utc)),
                    ),
                )
                inserted = cur.fetchone()
                if not inserted:
                    raise RuntimeError(f"No id returned for company {name}")
                company_id = inserted[0]

            # --- Insert each job ---
            for title, jdata in cdata.get("jobs", {}).items():
                job_url = jdata.get("job_url")
                cur.execute("SELECT 1 FROM job_raws WHERE url = %s LIMIT 1", (job_url,))
                if cur.fetchone():
                    continue

                cur.execute(
                    """
                    INSERT INTO job_raws
                        (title, description, url, date_posted,
                         skills, crawled_at, company_id,
                         salary_range, source)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        title,
                        jdata.get("description"),
                        job_url,
                        jdata.get("date_posted"),
                        jdata.get("skills") or [],
                        jdata.get("crawled_at", datetime.now(timezone.utc)),
                        company_id,
                        None,
                        jdata.get("source", "itviec"),
                    ),
                )

        conn.commit()
        cur.close()
        conn.close()
        print("Import completed.")
    except Exception as e:
        print("Database connection failed:", e)