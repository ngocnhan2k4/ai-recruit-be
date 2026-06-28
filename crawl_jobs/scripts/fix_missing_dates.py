import psycopg2
import argparse
from psycopg2.extras import RealDictCursor

def fix_missing_dates(db_url, dry_run=True):
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 1. Xử lý bảng jobs
        cur.execute("SELECT id, title FROM jobs WHERE date_posted IS NULL")
        jobs_to_fix = cur.fetchall()
        
        for job in jobs_to_fix:
            if dry_run:
                print(f"[DRY-RUN] Job '{job['title']}' (ID: {job['id']}) sẽ có date_posted = created_at")
            else:
                cur.execute("UPDATE jobs SET date_posted = created_at::date WHERE id = %s", (job['id'],))
        
        # 2. Xử lý bảng job_raws
        cur.execute("SELECT id, title FROM job_raws WHERE date_posted IS NULL")
        raws_to_fix = cur.fetchall()
        
        for raw in raws_to_fix:
            if dry_run:
                print(f"[DRY-RUN] JobRaw '{raw['title']}' (ID: {raw['id']}) sẽ có date_posted = crawled_at")
            else:
                # Đối với job_raws, chúng ta sử dụng crawled_at làm mốc thay thế
                cur.execute("UPDATE job_raws SET date_posted = crawled_at::date WHERE id = %s", (raw['id'],))
        
        if not dry_run:
            conn.commit()
            print(f"Đã cập nhật xong: {len(jobs_to_fix)} jobs và {len(raws_to_fix)} job_raws.")
        else:
            print(f"Chế độ dry-run hoàn tất. Sẽ có {len(jobs_to_fix)} jobs và {len(raws_to_fix)} job_raws được cập nhật.")

    except Exception as e:
        print(f"Lỗi: {e}")
        if not dry_run: conn.rollback()
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Script fix NULL date_posted")
    parser.add_argument("--db-url", required=True, help="PostgreSQL connection URL")
    parser.add_argument("--apply", action="store_true", help="Thực hiện update thật")
    
    args = parser.parse_args()
    fix_missing_dates(args.db_url, dry_run=not args.apply)