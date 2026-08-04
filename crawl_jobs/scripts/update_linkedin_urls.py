import argparse
import sys
import psycopg2


def main():
    parser = argparse.ArgumentParser(description="Update LinkedIn API Job URLs to View URLs")
    # Support both formats
    parser.add_argument("--db-url", dest="db_url", type=str, help="PostgreSQL Connection URL")
    parser.add_argument("--db_url", dest="db_url", type=str, help="PostgreSQL Connection URL (alternate)")
    
    args = parser.parse_args()
    
    if not args.db_url:
        print("Error: --db-url is required.")
        sys.exit(1)
        
    try:
        print("Connecting to PostgreSQL...")
        conn = psycopg2.connect(args.db_url)
        cur = conn.cursor()
        
        # 1. Count matching rows first
        count_query = """
            SELECT COUNT(*) FROM job_raws 
            WHERE url LIKE 'https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/%';
        """
        cur.execute(count_query)
        count = cur.fetchone()[0]
        
        print(f"Found {count} job urls with the LinkedIn API format.")
        
        if count > 0:
            # 2. Perform the update
            update_query = """
                UPDATE job_raws
                SET url = 'https://www.linkedin.com/jobs/view/' || substring(url from 'https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/([0-9]+)')
                WHERE url LIKE 'https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/%'
                RETURNING id, url;
            """
            cur.execute(update_query)
            updated_rows = cur.fetchall()
            conn.commit()
            
            print(f"Successfully updated {len(updated_rows)} LinkedIn URLs in database.")
            # Print a few examples
            if len(updated_rows) > 0:
                print("Examples of updated URLs:")
                for row in updated_rows[:5]:
                    print(f"  Job Raw ID {row[0]} -> {row[1]}")
        else:
            print("No URLs needed updating.")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Database error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
