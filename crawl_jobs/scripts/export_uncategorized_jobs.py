import argparse
import csv
import os

import psycopg2


def export_uncategorized_jobs(db_url: str, output_file: str) -> int:
    """
    Export all uncategorized jobs to a CSV file.
    Returns the number of jobs exported.
    """
    query = """
    SELECT j.id, j.title, c.name AS category, j.description::text, STRING_AGG(s.name, ', ') AS associated_skills 
    FROM jobs j
    JOIN organizations AS o ON o.id = j.organization_id
    JOIN job_raws AS jr ON jr.id = j.job_raw_id
    LEFT JOIN categories AS c ON c.id = j.category_id
    LEFT JOIN job_skills js ON j.id = js.job_id
    LEFT JOIN skills s ON js.skill_id = s.id
    WHERE c.id IS NULL
    GROUP BY j.id, j.title, c.name, j.description::text;
    """

    print("🔍 Querying uncategorized jobs...")
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    try:
        cur.execute(query)
        rows = cur.fetchall()
        columns = [desc[0] for desc in cur.description]

        print(f"📊 Found {len(rows)} uncategorized jobs")

        # Ensure directory exists
        os.makedirs(os.path.dirname(output_file), exist_ok=True)

        with open(output_file, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(columns)
            writer.writerows(rows)

        print(f"✅ Exported to {output_file}")
        return len(rows)

    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export uncategorized jobs to CSV")

    parser.add_argument(
        "--db_url",
        type=str,
        required=True,
        help="PostgreSQL Connection URL",
    )
    parser.add_argument(
        "--output_file",
        type=str,
        default="../classifier/data/predict_jobs.csv",
        help="Path to the output CSV file",
    )

    args = parser.parse_args()
    export_uncategorized_jobs(args.db_url, args.output_file)
