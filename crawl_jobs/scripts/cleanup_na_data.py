import psycopg2
import argparse
from psycopg2.extras import RealDictCursor

def cleanup_na_data(db_url, dry_run=True):
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Find organization ID for name = 'N/A'
        cur.execute("SELECT id FROM organizations WHERE name = 'N/A'")
        org_rows = cur.fetchall()
        org_ids = [r['id'] for r in org_rows]
        
        # Find company raw ID for name = 'N/A'
        cur.execute("SELECT id FROM company_raws WHERE name = 'N/A'")
        comp_raw_rows = cur.fetchall()
        comp_raw_ids = [r['id'] for r in comp_raw_rows]
        
        print(f"Found N/A Organizations IDs: {org_ids}")
        print(f"Found N/A Company Raws IDs: {comp_raw_ids}")
        
        if not org_ids and not comp_raw_ids:
            print("No N/A organization or company raw found. Nothing to delete.")
            return

        # Find jobs linked to N/A organization
        job_ids = []
        if org_ids:
            cur.execute("SELECT id, title FROM jobs WHERE organization_id = ANY(%s)", (org_ids,))
            job_rows = cur.fetchall()
            job_ids = [r['id'] for r in job_rows]
            print(f"Found {len(job_ids)} jobs linked to N/A organizations:")
            for j in job_rows:
                print(f" - {j['title']} (ID: {j['id']})")
        
        # Find job raws linked to N/A company raws
        job_raw_ids = []
        if comp_raw_ids:
            cur.execute("SELECT id, title FROM job_raws WHERE company_id = ANY(%s)", (comp_raw_ids,))
            job_raw_rows = cur.fetchall()
            job_raw_ids = [r['id'] for r in job_raw_rows]
            print(f"Found {len(job_raw_ids)} job_raws linked to N/A company_raws:")
            for jr in job_raw_rows:
                print(f" - {jr['title']} (ID: {jr['id']})")

        if dry_run:
            print("\n[DRY-RUN] The following deletions will be performed:")
            if job_ids:
                print(f" - Delete references in job_skills, job_provinces, user_interactions, apply_jobs for {len(job_ids)} jobs.")
                print(f" - Delete {len(job_ids)} jobs from jobs table.")
            if org_ids:
                print(f" - Delete entries in companies, organization_locations for {len(org_ids)} organizations.")
                print(f" - Delete {len(org_ids)} organizations from organizations table.")
            if job_raw_ids:
                print(f" - Delete {len(job_raw_ids)} job_raws from job_raws table.")
            if comp_raw_ids:
                print(f" - Delete {len(comp_raw_ids)} company_raws from company_raws table.")
            print("\nTo apply these changes, run with the --apply flag.")
            return

        # Execution Mode
        print("\nExecuting deletion...")
        
        # 1. Delete job mappings and child records
        if job_ids:
            cur.execute("DELETE FROM job_skills WHERE job_id = ANY(%s)", (job_ids,))
            cur.execute("DELETE FROM job_provinces WHERE job_id = ANY(%s)", (job_ids,))
            cur.execute("DELETE FROM user_interactions WHERE job_id = ANY(%s)", (job_ids,))
            cur.execute("DELETE FROM apply_jobs WHERE job_id = ANY(%s)", (job_ids,))
            # 2. Delete jobs
            cur.execute("DELETE FROM jobs WHERE id = ANY(%s)", (job_ids,))
            print(f"Deleted {len(job_ids)} jobs and their relations.")

        # 3. Delete organization mappings and child records
        if org_ids:
            cur.execute("DELETE FROM companies WHERE organization_id = ANY(%s)", (org_ids,))
            cur.execute("DELETE FROM organization_locations WHERE organization_id = ANY(%s)", (org_ids,))
            # 4. Delete organizations
            cur.execute("DELETE FROM organizations WHERE id = ANY(%s)", (org_ids,))
            print(f"Deleted {len(org_ids)} organizations.")

        # 5. Delete job raws
        if job_raw_ids:
            cur.execute("DELETE FROM job_raws WHERE id = ANY(%s)", (job_raw_ids,))
            print(f"Deleted {len(job_raw_ids)} job_raws.")

        # 6. Delete company raws
        if comp_raw_ids:
            cur.execute("DELETE FROM company_raws WHERE id = ANY(%s)", (comp_raw_ids,))
            print(f"Deleted {len(comp_raw_ids)} company_raws.")

        conn.commit()
        print("\nCleanup completed successfully!")

    except Exception as e:
        print(f"Error during cleanup: {e}")
        if 'conn' in locals():
            conn.rollback()
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Cleanup N/A Companies, Jobs, JobRaws and related data.")
    parser.add_argument("--db-url", required=True, help="PostgreSQL connection URL")
    parser.add_argument("--apply", action="store_true", help="Perform the actual deletion")
    
    args = parser.parse_args()
    cleanup_na_data(args.db_url, dry_run=not args.apply)
