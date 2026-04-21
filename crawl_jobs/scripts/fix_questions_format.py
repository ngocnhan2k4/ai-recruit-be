import argparse
import csv
import json
import sys

import psycopg2
from psycopg2.extras import RealDictCursor


def get_db_connection(db_url):
    try:
        return psycopg2.connect(db_url)
    except Exception as e:
        print(f"❌ Lỗi kết nối Database: {e}")
        sys.exit(1)


def load_csv_data(filepath):
    data = []
    try:
        with open(filepath, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                data.append(row)
        return data
    except Exception as e:
        print(f"❌ Lỗi đọc file CSV: {e}")
        sys.exit(1)


def find_matching_question(db_options, db_correct, skill_name, csv_data):
    """Tìm câu hỏi trong CSV dựa trên mảng options và correct_answer"""
    try:
        db_opts_list = (
            json.loads(db_options) if isinstance(db_options, str) else db_options
        )
        db_opts_set = set([str(x).strip().lower() for x in db_opts_list])
        db_correct_clean = str(db_correct).strip().lower()
    except Exception:
        return None

    potential_matches = []

    for row in csv_data:
        try:
            csv_opts_list = json.loads(row["options"])
            csv_opts_set = set([str(x).strip().lower() for x in csv_opts_list])
            csv_correct_clean = str(row["correct_answer"]).strip().lower()

            if db_opts_set == csv_opts_set and db_correct_clean == csv_correct_clean:
                potential_matches.append(row)
        except Exception:
            continue

    if not potential_matches:
        return None

    if len(potential_matches) == 1:
        return potential_matches[0]["question_text"]

    # TIE-BREAKER
    for match in potential_matches:
        search_text = f"{match.get('quiz_title', '')} {match.get('category', '')} {match.get('tags', '')}".lower()
        if skill_name.lower() in search_text:
            return match["question_text"]

    return potential_matches[0]["question_text"]


def main():
    parser = argparse.ArgumentParser(
        description="Data Patching: Map from CSV to update 'Which answer is correct' in DB"
    )
    parser.add_argument("--db-url", required=True, help="Chuỗi kết nối PostgreSQL")
    parser.add_argument(
        "--csv", required=True, help="Đường dẫn tới file CSV đã export chuẩn"
    )
    parser.add_argument(
        "--commit",
        type=str.lower,
        choices=["true", "false"],
        default="false",
        help="Set 'true' để UPDATE vào Database",
    )

    args = parser.parse_args()
    is_commit = args.commit == "true"

    print(
        f"🔧 Chế độ: {'🔥 UPDATE DATABASE' if is_commit else '📝 DRY-RUN (Chỉ dò tìm, không lưu)'}"
    )

    conn = get_db_connection(args.db_url)
    cur = conn.cursor(cursor_factory=RealDictCursor)
    csv_data = load_csv_data(args.csv)

    print(f"📦 Đã load {len(csv_data)} câu hỏi gốc từ file CSV.")

    try:
        # CHỈ LẤY NHỮNG CÂU ĐÚNG CHÍNH XÁC TEXT LÀ 'Which answer is correct'
        query = """
            SELECT q.id, q.options, q.correct_answer, q.question_text, s.name as skill_name 
            FROM questions q
            JOIN skills s ON q.skill_id = s.id
            WHERE q.question_text = 'Which answer is correct';
        """
        cur.execute(query)
        broken_questions = cur.fetchall()

        print(
            f"🔍 Tìm thấy {len(broken_questions)} câu hỏi cần được fix trong Database."
        )

        patched_count = 0
        unmatched_count = 0

        for q in broken_questions:
            q_id = q["id"]
            skill_name = q["skill_name"]

            matched_text = find_matching_question(
                q["options"], q["correct_answer"], skill_name, csv_data
            )

            if matched_text:
                if is_commit:
                    cur.execute(
                        "UPDATE questions SET question_text = %s WHERE id = %s",
                        (matched_text, q_id),
                    )
                patched_count += 1

                if patched_count <= 5:  # Tăng số lượng log hiển thị lên 5 để dễ review
                    print(f"\n--- [MATCHED ID: {q_id} | Skill: {skill_name}] ---")
                    print(f"🔴 OLD Text: {q['question_text']}")
                    print(f"🟢 NEW Text: {matched_text}")
            else:
                unmatched_count += 1
                if unmatched_count <= 3:
                    print(
                        f"\n⚠️ [NOT_FOUND ID: {q_id}] - Không tìm thấy data khớp options trong CSV."
                    )

        if is_commit:
            conn.commit()
            print(f"\n✅ ĐÃ LƯU: Cập nhật (Patch) thành công {patched_count} câu hỏi!")
            if unmatched_count > 0:
                print(
                    f"⚠️ Có {unmatched_count} câu hỏi không tìm thấy data khớp để map."
                )
        else:
            print(
                f"\n📝 DRY-RUN: Sẽ cập nhật {patched_count} câu. Không map được {unmatched_count} câu. Thêm '--commit true' để thực thi."
            )

    except Exception as e:
        if is_commit:
            conn.rollback()
            print("🚨 Đã Rollback Database do có lỗi xảy ra.")
        print(f"Lỗi hệ thống: {e}")
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()
