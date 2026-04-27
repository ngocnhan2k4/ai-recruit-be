import argparse
import csv
import re
import sys
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection(db_url):
    try:
        return psycopg2.connect(db_url)
    except Exception as e:
        print(f"❌ Lỗi kết nối Database: {e}")
        sys.exit(1)

def get_missing_skills(cur):
    query = """
    SELECT s.id, s.name FROM skills s
    LEFT JOIN questions q ON s.id = q.skill_id
    WHERE q.id IS NULL AND s.is_approved = true;
    """
    cur.execute(query)
    return cur.fetchall()

def load_csv_data(csv_file):
    questions = []
    try:
        with open(csv_file, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                questions.append(row)
        return questions
    except Exception as e:
        print(f"❌ Lỗi đọc file CSV: {e}")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Match and Insert CSV Questions to Database")
    parser.add_argument("--db-url", required=True, help="PostgreSQL connection string")
    parser.add_argument("--csv", default="quizapi_questions.csv", help="Input CSV filename")
    parser.add_argument("--insert", type=str.lower, choices=['true', 'false'], default='false', help="Set to true to commit DB changes")
    args = parser.parse_args()

    is_insert = args.insert == 'true'
    print(f"🔧 Chế độ hoạt động: {'INSERT VÀO DATABASE' if is_insert else 'DRY-RUN (Không thay đổi DB)'}")

    conn = get_db_connection(args.db_url)
    cur = conn.cursor(cursor_factory=RealDictCursor)
    csv_questions = load_csv_data(args.csv)

    print(f"📦 Đã load {len(csv_questions)} câu hỏi từ {args.csv}")

    try:
        missing_skills = get_missing_skills(cur)
        if not missing_skills:
            print("🎉 Tất cả các skill đều đã có câu hỏi. Không cần chạy tiếp.")
            return

        total_inserted = 0

        for skill in missing_skills:
            skill_name = skill['name']
            skill_id = skill['id']
            # Match skill_name với quiz_title, category, hoặc tags. Ignorcase
            pattern = re.compile(rf'\b{re.escape(skill_name)}\b', re.IGNORECASE)
            
            matched_qs = []
            for q in csv_questions:
                search_text = f"{q['quiz_title']} {q['category']} {q['tags']}"
                if pattern.search(search_text):
                    matched_qs.append(q)

            if not matched_qs:
                print(f"❌ [NOT_FOUND] Skill '{skill_name}': Không tìm thấy câu hỏi matching trong CSV.")
                continue

            print(f"✅ [FOUND] Skill '{skill_name}': Khớp được {len(matched_qs)} câu hỏi.")
            total_inserted += len(matched_qs)

            if is_insert:
                for q in matched_qs:
                    cur.execute("""
                        INSERT INTO questions (skill_id, question_text, options, correct_answer, difficulty_levels)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (
                        skill_id, 
                        q['question_text'], 
                        q['options'], 
                        q['correct_answer'], 
                        q['difficulty_levels']
                    ))

        if is_insert:
            conn.commit()
            print(f"\n💾 ĐÃ LƯU: Commit thành công {total_inserted} câu hỏi vào Database!")
        else:
            print(f"\n📝 DRY-RUN: Nếu bật --insert true, hệ thống sẽ chèn {total_inserted} câu hỏi vào DB.")

    except Exception as e:
        if is_insert:
            conn.rollback()
            print("🚨 Đã Rollback Database do gặp lỗi trong quá trình Insert.")
        print(f"Lỗi hệ thống: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    main()