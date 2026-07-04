import psycopg2
import argparse
from psycopg2.extras import RealDictCursor

def process_salaries(db_url, dry_run=True):
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Lấy dữ liệu từ jobs có liên kết với job_raws
        # Chỉ lấy những jobs có job_raw_id để update đồng thời
        query = """
        SELECT j.id, j.title, j.salary_min, j.salary_max, j.job_raw_id 
        FROM jobs j
        WHERE j.salary_min > 100 OR j.salary_max > 100
        """
        cur.execute(query)
        jobs = cur.fetchall()
        
        for job in jobs:
            updates = {}
            for field in ['salary_min', 'salary_max']:
                val = job[field]
                if val is None or val <= 100:
                    continue
                
                # Logic: 1000-2000 -> USD (x25000) -> /1tr; >1tr -> VND -> /1tr
                if 1000 <= val <= 2000:
                    new_val = (val * 25000) / 1000000
                elif val > 1000000:
                    new_val = val / 1000000
                else:
                    continue
                
                updates[field] = new_val
            
            if updates:
                if dry_run:
                    print(f"[DRY-RUN] Job '{job['title']}' (ID: {job['id']}) sẽ cập nhật: {updates}")
                else:
                    # Update bảng jobs
                    set_clause = ", ".join([f"{k} = {v}" for k, v in updates.items()])
                    cur.execute(f"UPDATE jobs SET {set_clause} WHERE id = '{job['id']}'")
                    
                    # Update bảng job_raws nếu có link
                    if job['job_raw_id']:
                        cur.execute(f"UPDATE job_raws SET {set_clause} WHERE id = {job['job_raw_id']}")
                    
                    print(f"[APPLY] Đã cập nhật Job ID: {job['id']} và Job Raw ID: {job['job_raw_id']}")
        
        if not dry_run:
            conn.commit()
            print("Đã commit thay đổi vào cả bảng jobs và job_raws.")
        else:
            print("Chế độ dry-run, không có thay đổi nào được thực hiện.")

    except Exception as e:
        print(f"Lỗi: {e}")
        if not dry_run: conn.rollback()
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Script cập nhật salary jobs và job_raws")
    parser.add_argument("--db-url", required=True, help="PostgreSQL connection URL")
    parser.add_argument("--apply", action="store_true", help="Thực hiện update thật")
    
    args = parser.parse_args()
    process_salaries(args.db_url, dry_run=not args.apply)