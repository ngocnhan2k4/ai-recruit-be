import argparse
import csv
import json
import psycopg2
import os
import sys

# Thêm đường dẫn để có thể import các helper từ project
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from helpers.text import slugify

def import_skills(db_url, csv_path):
    print(f"Importing skills from {csv_path} to database...")
    
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        with open(csv_path, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            inserted_count = 0
            updated_count = 0
            
            for row in reader:
                name = row.get('name')
                if not name:
                    continue
                
                slug = row.get('slug') or slugify(name)
                description = row.get('description')
                
                proficiency_levels = row.get('proficiency_levels')
                # Đảm bảo proficiency_levels là một JSON string hợp lệ hoặc None
                if proficiency_levels:
                    try:
                        # Kiểm tra xem có phải là JSON hợp lệ không
                        json.loads(proficiency_levels)
                    except json.JSONDecodeError:
                        print(f"Warning: Invalid JSON for skill {name}, setting to null")
                        proficiency_levels = None
                else:
                    proficiency_levels = None

                is_approved = row.get('is_approved') == 't'
                
                # Kiểm tra skill đã tồn tại qua slug (unique)
                cur.execute("SELECT id FROM skills WHERE slug = %s", (slug,))
                existing_skill = cur.fetchone()
                
                if existing_skill:
                    # Update
                    cur.execute(
                        """
                        UPDATE skills 
                        SET name = %s, description = %s, proficiency_levels = %s, is_approved = %s, updated_at = NOW()
                        WHERE id = %s
                        """,
                        (name, description, proficiency_levels, is_approved, existing_skill[0])
                    )
                    updated_count += 1
                else:
                    # Insert
                    # Nếu trong CSV có ID thì dùng, không thì để DB tự tạo (defaultRandom)
                    skill_id = row.get('id')
                    if skill_id:
                        cur.execute(
                            """
                            INSERT INTO skills (id, name, slug, description, proficiency_levels, is_approved, created_at, updated_at)
                            VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
                            """,
                            (skill_id, name, slug, description, proficiency_levels, is_approved)
                        )
                    else:
                        cur.execute(
                            """
                            INSERT INTO skills (name, slug, description, proficiency_levels, is_approved, created_at, updated_at)
                            VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
                            """,
                            (name, slug, description, proficiency_levels, is_approved)
                        )
                    inserted_count += 1
            
            conn.commit()
            print(f"Successfully processed skills: {inserted_count} inserted, {updated_count} updated.")
            
    except Exception as e:
        print(f"Error importing skills: {e}")
        if 'conn' in locals() and conn:
            conn.rollback()
    finally:
        if 'cur' in locals() and cur:
            cur.close()
        if 'conn' in locals() and conn:
            conn.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Import skills from CSV to database')
    parser.add_argument('--db-url', type=str, help='Database connection URL')
    parser.add_argument('--file', type=str, default='skills/data/skills.csv', help='Path to skills CSV file')
    
    args = parser.parse_args()
    
    db_url = args.db_url
    if not db_url:
        # Thử lấy từ biến môi trường nếu không truyền vào
        db_url = os.environ.get('DATABASE_URL')
    
    if not db_url:
        print("Error: --db-url is required or DATABASE_URL environment variable must be set.")
        sys.exit(1)
        
    # Xử lý path mặc định nếu chạy từ root hoặc từ crawl_jobs
    csv_path = args.file
    if not os.path.exists(csv_path):
        # Thử đường dẫn tương đối so với script nếu không tìm thấy
        possible_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'skills', 'data', 'skills.csv')
        if os.path.exists(possible_path):
            csv_path = possible_path
        else:
            print(f"Error: CSV file not found at {csv_path}")
            sys.exit(1)
            
    import_skills(db_url, csv_path)
