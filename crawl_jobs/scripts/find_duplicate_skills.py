import argparse
import psycopg2
from rapidfuzz import process, fuzz
from tqdm import tqdm

def find_duplicate_skills(db_url, threshold=90, dry_run=True):
    print("Connecting to PostgreSQL...")
    conn = None
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()

        if dry_run:
            print("\n--- MODE: DRY-RUN (No changes will be made) ---")
        else:
            print("\n--- MODE: LIVE (Skills will be merged and deleted) ---")

        # Fetch all skills with their slug status
        print("Fetching skills from database...")
        cur.execute("SELECT id, name, slug FROM skills")
        rows = cur.fetchall()
        
        if not rows:
            print("No skills found in database.")
            return

        skills = []
        for r in rows:
            skills.append({
                "id": r[0],
                "name": r[1],
                "slug": r[2]
            })

        print(f"Analyzing {len(skills)} skills for duplicates (threshold: {threshold}%)...")
        
        duplicates = []
        processed_ids = set()

        for i in tqdm(range(len(skills))):
            skill_a = skills[i]
            if skill_a["id"] in processed_ids:
                continue
                
            current_group = [skill_a]
            
            for j in range(i + 1, len(skills)):
                skill_b = skills[j]
                if skill_b["id"] in processed_ids:
                    continue
                
                # Fuzzy ratio comparison (case-insensitive)
                ratio = fuzz.ratio(skill_a["name"].lower(), skill_b["name"].lower())
                
                if ratio >= threshold:
                    current_group.append(skill_b)
            
            if len(current_group) > 1:
                # Decide Master Skill: 
                # 1. Prefer ones with a slug
                # 2. Prefer the one with the shortest name (usually more canonical)
                with_slug = [s for s in current_group if s["slug"]]
                
                if with_slug:
                    master = sorted(with_slug, key=lambda x: len(x["name"]))[0]
                else:
                    master = sorted(current_group, key=lambda x: len(x["name"]))[0]
                
                others = [s for s in current_group if s["id"] != master["id"]]
                
                duplicates.append({
                    "master": master,
                    "duplicates": others
                })
                
                # Mark all in group as processed
                for s in current_group:
                    processed_ids.add(s["id"])

        # Output and Processing
        if not duplicates:
            print("\nNo potential duplicates found.")
        else:
            print(f"\nFound {len(duplicates)} groups of potential duplicate skills:\n")
            
            # Table Header
            print(f"{'MASTER SKILL':<40} | {'DUPLICATES'}")
            print("-" * 90)

            for group in duplicates:
                master = group['master']
                others = group['duplicates']
                
                master_display = f"{master['name']} (Slug: {master['slug'] or 'None'})"
                duplicates_display = ", ".join([s['name'] for s in others])
                
                print(f"{master_display:<40} | {duplicates_display}")

                if not dry_run:
                    try:
                        cur.execute("SAVEPOINT group_merge")
                        for dup in others:
                            # 1. Update job_skills to point to the master skill ID
                            # ON CONFLICT DO NOTHING handles cases where a job already had both skills
                            cur.execute("""
                                UPDATE job_skills 
                                SET skill_id = %s 
                                WHERE skill_id = %s
                                AND NOT EXISTS (
                                    SELECT 1 FROM job_skills js2 
                                    WHERE js2.job_id = job_skills.job_id 
                                    AND js2.skill_id = %s
                                )
                            """, (master['id'], dup['id'], master['id']))
                            
                            # 2. Delete any remaining duplicate entries in job_skills (those job already had master)
                            cur.execute("DELETE FROM job_skills WHERE skill_id = %s", (dup['id'],))
                            
                            # 3. Delete the duplicate skill itself
                            cur.execute("DELETE FROM skills WHERE id = %s", (dup['id'],))
                            
                        cur.execute("RELEASE SAVEPOINT group_merge")
                        print(f"  ✓ Merged and deleted successfully.")
                    except Exception as e:
                        cur.execute("ROLLBACK TO SAVEPOINT group_merge")
                        print(f"  ⚠️ Error merging group: {e}")

        if not dry_run:
            conn.commit()
            print("\nAll changes committed to database.")
        else:
            print("\nDry-run completed. No changes were made to the database.")

    except Exception as e:
        print(f"Global Error: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            cur.close()
            conn.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Find and merge duplicate skills using fuzzy matching.")
    parser.add_argument("--db-url", required=True, help="PostgreSQL connection URL")
    parser.add_argument("--threshold", type=int, default=90, help="Fuzzy matching threshold (0-100, default: 90)")
    parser.add_argument("--dry-run", type=str, default="true", choices=["true", "false"], help="Dry run mode (default: true)")

    args = parser.parse_args()
    
    is_dry_run = args.dry_run.lower() == "true"
    find_duplicate_skills(args.db_url, args.threshold, is_dry_run)
