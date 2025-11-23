import pandas as pd
import psycopg2

DB_URL = "postgresql://neondb_owner:npg_VFCRk1Q0cTju@ep-tiny-art-a1vu0die-pooler.ap-southeast-1.aws.neon.tech/airecruit?sslmode=require&channel_binding=require"

CSV_FILE = "../data/results.csv"

def get_or_create_category_id(cur, category_name):
    """
    1. Checks if the category name exists in the 'categories' table.
    2. If yes, returns its UUID.
    3. If no, inserts it and returns the new UUID.
    """
    # Check if exists
    cur.execute("SELECT id FROM categories WHERE name = %s", (category_name,))
    result = cur.fetchone()
    
    if result:
        return result[0]
    else:
        # Create new
        print(f"   + Creating new category: {category_name}")
        cur.execute(
            "INSERT INTO categories (name) VALUES (%s) RETURNING id",
            (category_name,)
        )
        new_id = cur.fetchone()[0]
        return new_id

def update_database():
    print(f"Loading {CSV_FILE}...")
    try:
        df = pd.read_csv(CSV_FILE)
    except FileNotFoundError:
        print(f"Error: {CSV_FILE} not found.")
        return

    print("Connecting to PostgreSQL...")
    conn = None
    try:
        # --- CONNECT USING URL ---
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()

        print(f"Processing {len(df)} jobs...")
        
        success_count = 0
        
        for _, row in df.iterrows():
            job_id = row['id']
            predicted_cat = row['predicted_category']
            
            if pd.isna(job_id) or pd.isna(predicted_cat):
                continue

            category_id = get_or_create_category_id(cur, predicted_cat)

            cur.execute("DELETE FROM job_categories WHERE job_id = %s", (job_id,))
            
            cur.execute(
                "INSERT INTO job_categories (job_id, category_id) VALUES (%s, %s)",
                (job_id, category_id)
            )
            
            success_count += 1
            
            if success_count % 100 == 0:
                print(f"   ...processed {success_count} rows")

        # Commit transaction
        conn.commit()
        print("="*40)
        print(f"✅ Success! Updated categories for {success_count} jobs.")
        print("="*40)

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"❌ Error occurred: {e}")
        print("Rolled back all changes.")
    
    finally:
        if conn:
            cur.close()
            conn.close()

if __name__ == "__main__":
    update_database()