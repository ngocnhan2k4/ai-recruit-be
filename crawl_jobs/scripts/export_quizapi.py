import argparse
import csv
import json
import time

import requests

# Danh sách các category IT
IT_CATEGORIES = [
    "Programming",
    "Database",
    "DevOps/Cloud",
    "DevOps",
    "Cloud",
    "Cybersecurity",
    "CSS/HTML",
    "TypeScript",
    "Python",
    "Software Engineering",
    "Web Performance",
]


def fetch_it_quizzes(api_key):
    print("🔍 Đang lấy danh sách Quizzes từ QuizAPI (Có xử lý Phân trang)...")
    headers = {"Authorization": f"Bearer {api_key}"}

    all_quizzes = []
    limit = 50
    offset = 0

    while True:
        url = f"https://quizapi.io/api/v1/quizzes?limit={limit}&offset={offset}"
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 429:
                print("  ⚠️ Rate limit, đợi 5s...")
                time.sleep(5)
                continue

            response.raise_for_status()
            data = response.json()

            if not data.get("success"):
                print("❌ Lỗi từ API:", data)
                break

            batch_quizzes = data.get("data", [])
            all_quizzes.extend(batch_quizzes)

            meta = data.get("meta", {})
            total = meta.get("total", 0)

            print(f"  -> Đã tải {len(all_quizzes)}/{total} quizzes...")

            # Nếu không còn data hoặc đã lấy đủ total thì dừng vòng lặp
            if not batch_quizzes or len(all_quizzes) >= total:
                break

            offset += limit
            time.sleep(1)  # Tránh hammer API

        except Exception as e:
            print(f"❌ Lỗi khi lấy danh sách quiz: {e}")
            break

    # Lọc ra các quiz thuộc mảng IT
    it_quizzes = [q for q in all_quizzes if q.get("category") in IT_CATEGORIES]
    print(
        f"✅ Tìm thấy {len(it_quizzes)} IT quizzes (trên tổng số {len(all_quizzes)} toàn hệ thống)."
    )
    return it_quizzes


def fetch_questions_for_quiz(api_key, quiz_id):
    headers = {"Authorization": f"Bearer {api_key}"}
    all_questions = []
    limit = 50
    offset = 0

    while True:
        url = f"https://quizapi.io/api/v1/questions?quiz_id={quiz_id}&include_answers=true&limit={limit}&offset={offset}"
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 429:
                print("  ⚠️ Rate limit, đợi 5s...")
                time.sleep(5)
                continue

            response.raise_for_status()
            data = response.json()

            # Xử lý các format khác nhau trả về từ API
            if isinstance(data, list):
                all_questions.extend(data)
                # Nếu trả về list thuần túy, check nếu số lượng < limit -> đã lấy hết trang cuối
                if len(data) < limit:
                    break
                offset += limit

            elif isinstance(data, dict):
                if "data" in data and isinstance(data["data"], list):
                    batch_questions = data["data"]
                    all_questions.extend(batch_questions)

                    meta = data.get("meta", {})
                    total = meta.get("total", 0)

                    if not batch_questions or len(all_questions) >= total:
                        break
                    offset += limit
                elif "error" in data:
                    print(f"  ⚠️ API Error: {data.get('error')}")
                    break
                elif "answers" in data:  # Trường hợp dị trả về thẳng 1 object
                    all_questions.append(data)
                    break
                else:
                    break
            else:
                break

            time.sleep(1)  # Delay nhẹ giữa các trang của cùng 1 quiz

        except Exception as e:
            print(f"  ⚠️ Lỗi khi gọi API cho quiz {quiz_id}: {e}")
            break

    return all_questions


def transform_question(q, quiz_info):
    """Chuyển đổi format QuizAPI chuẩn hóa thẳng về Schema DB"""
    # 1. Lấy text câu hỏi (Lỗi cũ nằm ở đây do tìm key 'question')
    question_text = q.get("text")

    # 2. Lấy mảng câu trả lời
    raw_answers = q.get("answers", [])

    options_list = []
    correct_answer_text = None

    for ans in raw_answers:
        # Lấy nội dung text của từng option
        ans_text = str(ans.get("text", "")).strip()

        if ans_text:
            options_list.append(ans_text)

            # Nếu option này có cờ isCorrect = true, gán nó làm đáp án đúng
            if ans.get("isCorrect") is True:
                correct_answer_text = ans_text

    # Fallback an toàn nếu API lỗi không trả về đáp án đúng nào
    if not correct_answer_text and options_list:
        correct_answer_text = options_list[0]

    # Format độ khó về dạng ["easy", "medium", "hard"] khớp với DB của bạn
    diff_level = str(
        q.get("difficulty") or quiz_info.get("difficulty", "medium")
    ).lower()

    return {
        "quiz_title": quiz_info.get("title", ""),
        "category": quiz_info.get("category", ""),
        "tags": ",".join(quiz_info.get("tags", [])),
        "question_text": question_text,
        "options": json.dumps(
            options_list, ensure_ascii=False
        ),  # Xuất mảng ["8", "9", "7", "10"]
        "correct_answer": correct_answer_text,  # Xuất chuỗi "8"
        "difficulty_levels": json.dumps(
            [diff_level], ensure_ascii=False
        ),  # Xuất mảng ["easy"]
    }


def main():
    parser = argparse.ArgumentParser(
        description="Export IT Questions from QuizAPI to CSV with Pagination"
    )
    parser.add_argument(
        "--api-key", required=True, help="QuizAPI API Key (Bearer Token)"
    )
    parser.add_argument(
        "--out", default="quizapi_questions.csv", help="Output CSV filename"
    )
    args = parser.parse_args()

    quizzes = fetch_it_quizzes(args.api_key)
    all_questions_csv = []

    for quiz in quizzes:
        print(f"⬇️ Đang lấy câu hỏi cho: {quiz['title']}...")
        questions = fetch_questions_for_quiz(args.api_key, quiz["id"])

        for q in questions:
            transformed = transform_question(q, quiz)
            if transformed["options"] != "{}" and transformed["correct_answer"]:
                all_questions_csv.append(transformed)

        time.sleep(1)

    if all_questions_csv:
        with open(args.out, mode="w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=all_questions_csv[0].keys())
            writer.writeheader()
            writer.writerows(all_questions_csv)
        print(f"\n✅ Đã lưu {len(all_questions_csv)} câu hỏi ra file {args.out}")
    else:
        print("\n⚠️ Không tìm thấy câu hỏi hợp lệ nào.")


if __name__ == "__main__":
    main()
