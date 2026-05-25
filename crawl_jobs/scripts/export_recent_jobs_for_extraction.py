import argparse
import sys

import pandas as pd
import psycopg2


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db-url", required=True)
    parser.add_argument("--output-file", default="./data/jobs_export.csv")
    parser.add_argument(
        "--hours",
        type=int,
        default=24,
        help="Fetch jobs crawled or updated in the last N hours",
    )
    args = parser.parse_args()

    try:
        conn = psycopg2.connect(args.db_url)
        # Fetch recently crawled/updated jobs to extract skills from JD
        query = f"""
            SELECT 
                id, 
                title, 
                description,
                '' as existing_skill_names,
                '' as existing_skill_ids
            FROM jobs
            WHERE description IS NOT NULL AND description != ''
              AND (created_at >= NOW() - INTERVAL '{args.hours} hours' OR updated_at >= NOW() - INTERVAL '{args.hours} hours');
        """
        df = pd.read_sql_query(query, conn)
        df.to_csv(args.output_file, index=False)
        print(f"Exported {len(df)} jobs for extraction.")
        conn.close()
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
