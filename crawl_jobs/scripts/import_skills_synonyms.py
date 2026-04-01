import argparse
import pandas as pd
import psycopg2
from tqdm import tqdm

# python crawl_jobs/scripts/import_skills_synonyms.py --db-url "<YOUR_DB_URL>" --source "stackoverflow"
def import_skills_synonyms(db_url, csv_file, source="stackoverflow"):
    print(f"Loading {csv_file}...")
    try:
        df = pd.read_csv(csv_file)
    except Exception as e:
        print(f"Error reading {csv_file}: {e}")
        return

    # Check columns based on the CSV structure: Alias, MasterTag
    if "Alias" not in df.columns or "MasterTag" not in df.columns:
        print("Error: CSV must contain 'Alias' and 'MasterTag' columns.")
        return

    print("Connecting to PostgreSQL...")
    conn = None
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()

        # Table schema for skills_synonyms:
        # id: uuid (primary key, default random)
        # source: varchar(50)
        # alias_name: varchar(255)
        # master_name: varchar(255)
        
        insert_query = """
            INSERT INTO skills_synonyms (source, alias_name, master_name)
            VALUES (%s, %s, %s)
            ON CONFLICT (alias_name, source) DO UPDATE
            SET master_name = EXCLUDED.master_name;
        """

        print(f"Importing {len(df)} records...")
        success_count = 0
        
        for _, row in tqdm(df.iterrows(), total=len(df)):
            alias = row["Alias"]
            master = row["MasterTag"]
            
            try:
                cur.execute(insert_query, (source, alias, master))
                success_count += 1
            except Exception as e:
                print(f"Error inserting {alias}: {e}")
                conn.rollback()
                continue
        
        conn.commit()
        print(f"Successfully imported/updated {success_count} records.")

    except Exception as e:
        print(f"Database error: {e}")
    finally:
        if conn:
            cur.close()
            conn.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Import skills synonyms from CSV to PostgreSQL.")
    parser.add_argument("--db-url", required=True)
    parser.add_argument("--csv-file", default="skills/data/skills_synonyms.csv")
    parser.add_argument("--source", default="stackoverflow")

    args = parser.parse_args()

    import_skills_synonyms(args.db_url, args.csv_file, args.source)
