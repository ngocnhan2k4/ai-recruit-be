import os
import sys
import psycopg2
from dotenv import load_dotenv

def fix_job_titles():
    print("--- FIXING JOB TITLES IN DB ---")
    
    # Load environment variables from .env file in the scripts directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.join(script_dir, '.env')
    
    db_dev_url = None
    db_prod_url = None

    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                if '=' in line:
                    key, val = line.split('=', 1)
                    val = val.strip().strip('\'"')
                    if key.strip() == 'DATABASE_URL_DEV':
                        db_dev_url = val
                    elif key.strip() in ('DATABASE_URL_PROD', 'DB_PROD_URL'):
                        db_prod_url = val
        print(f"Loaded .env from {env_path}")
    else:
        print(f"Warning: .env file not found at {env_path}")
    
    # Check what URLs are available, maybe run on both? Or just the one provided.
    urls_to_process = []
    if db_dev_url:
        urls_to_process.append(("DEV DB", db_dev_url))
    if db_prod_url:
        urls_to_process.append(("PROD DB", db_prod_url))
        
    if not urls_to_process:
        print("ERROR: No database URLs found in environment variables.")
        print("Please set DATABASE_URL_DEV or DATABASE_URL_PROD.")
        sys.exit(1)

    # Dictionary of replacements: bad_split -> correct_casing
    replacements = {
        "Ai Ops": "AIOps",
        "Dev Ops": "DevOps",
        "Dev Sec Ops": "DevSecOps",
        "Sec Ops": "SecOps",
        "Br SE": "BrSE",
        "Ed Tech": "EdTech",
        "Fin Tech": "FinTech",
        "Teen Care": "TeenCare",
        "Git Hub": "GitHub",
        "Git Lab": "GitLab",
        "Java Script": "JavaScript",
        "Type Script": "TypeScript"
    }

    for env_name, db_url in urls_to_process:
        print(f"\nProcessing {env_name}...")
        conn = None
        try:
            conn = psycopg2.connect(db_url)
            cur = conn.cursor()
            
            for bad_word, good_word in replacements.items():
                print(f"  Fixing '{bad_word}' -> '{good_word}'")
                
                # Update jobs table
                # We use REGEXP_REPLACE with 'i' flag for case-insensitive replacement to catch variations
                # But to avoid messing up things, a simple case-insensitive REGEXP_REPLACE matching whole words is safer
                # PostgreSQL regex: \m (start of word) \M (end of word)
                
                # jobs table
                cur.execute("""
                    UPDATE jobs 
                    SET title = REGEXP_REPLACE(title, '\\m' || %s || '\\M', %s, 'gi')
                    WHERE title ~* ('\\m' || %s || '\\M');
                """, (bad_word, good_word, bad_word))
                jobs_updated = cur.rowcount
                
                # job_raws table
                cur.execute("""
                    UPDATE job_raws 
                    SET title = REGEXP_REPLACE(title, '\\m' || %s || '\\M', %s, 'gi')
                    WHERE title ~* ('\\m' || %s || '\\M');
                """, (bad_word, good_word, bad_word))
                job_raws_updated = cur.rowcount
                
                if jobs_updated > 0 or job_raws_updated > 0:
                    print(f"    -> Updated {jobs_updated} row(s) in 'jobs', {job_raws_updated} row(s) in 'job_raws'.")
            
            conn.commit()
            print(f"Successfully committed changes to {env_name}.")
            
        except Exception as e:
            print(f"Error processing {env_name}: {e}")
            if conn:
                conn.rollback()
        finally:
            if conn:
                cur.close()
                conn.close()

if __name__ == "__main__":
    fix_job_titles()
