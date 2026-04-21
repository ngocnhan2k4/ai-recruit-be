import argparse
import requests
import csv
import json
import time
import sys

# Danh sách các category IT dựa trên data bạn cung cấp
IT_CATEGORIES = [
    "Programming", "Database", "DevOps/Cloud", "DevOps", "Cloud", 
    "Cybersecurity", "CSS/HTML", "TypeScript", "Python", 
    "Software Engineering", "Web Performance"
]

def fetch_it_quizzes(api_key):
    print("🔍 Đang lấy danh sách Quizzes từ QuizAPI...")
    headers = {"Authorization": f"Bearer {api_key}"}
    url = "https://quizapi.io/api/v1/quizzes?limit=1000"
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        data = response.json()
        
        if not data.get("success"):
            print("❌ Lỗi từ API:", data)
            sys.exit(1)
            
        quizzes = data.get("data", [])
        # Lọc ra các quiz thuộc mảng IT
        it_quizzes = [q for q in quizzes if q.get("category") in IT_CATEGORIES]
        print(f"✅ Tìm thấy {len(it_quizzes)} IT quizzes (trên tổng số {len(quizzes)}).")
        return it_quizzes
    except Exception as e:
        print(f"❌ Lỗi khi lấy danh sách quiz: {e}")
        sys.exit(1)

def fetch_questions_for_quiz(api_key, quiz_id):
    headers = {"Authorization": f"Bearer {api_key}"}
    url = f"https://quizapi.io/api/v1/questions?quiz_id={quiz_id}&include_answers=true"
    
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 429:
            print("⚠️ Rate limit, sleeping for 5s...")
            time.sleep(5)
            response = requests.get(url, headers=headers)
            
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"⚠️ Lỗi khi lấy câu hỏi cho quiz {quiz_id}: {e}")
        return []

def transform_question(q, quiz_info):
    """Chuyển đổi format QuizAPI (answer_a, answer_b) sang schema DB (A, B, C, D)"""
    answers = q.get("answers", {})
    correct_answers = q.get("correct_answers", {})
    
    # Map key của QuizAPI sang label chuẩn
    label_map = {
        "answer_a": "A", "answer_b": "B", 
        "answer_c": "C", "answer_d": "D",
        "answer_e": "E", "answer_f": "F"
    }
    
    options = {}
    correct_label = None
    
    for ans_key, text in answers.items():
        if text is not None and text.strip() != "":
            label = label_map.get(ans_key)
            if label:
                options[label] = text
                # Kiểm tra xem đáp án này có đúng không
                correct_key = f"{ans_key}_correct"
                if correct_answers.get(correct_key) == "true":
                    correct_label = label

    # Nếu câu hỏi dạng Multiple Correct Answers, tạm thời bỏ qua hoặc chỉ lấy đáp án đúng đầu tiên 
    # (vì DB schema hiện tại lưu correct_answer là chuỗi đơn)
    if not correct_label and options:
        # Fallback nếu API trả về lỗi logic
        correct_label = list(options.keys())[0]

    return {
        "quiz_title": quiz_info["title"],
        "category": quiz_info["category"],
        "tags": ",".join(quiz_info.get("tags", [])),
        "question_text": q.get("question"),
        "options": json.dumps(options, ensure_ascii=False),
        "correct_answer": correct_label,
        "difficulty_levels": json.dumps({"level": q.get("difficulty") or quiz_info.get("difficulty", "MEDIUM")})
    }

def main():
    parser = argparse.ArgumentParser(description="Export IT Questions from QuizAPI to CSV")
    parser.add_argument("--api-key", required=True, help="QuizAPI API Key (Bearer Token)")
    parser.add_argument("--out", default="quizapi_questions.csv", help="Output CSV filename")
    args = parser.parse_args()

    quizzes = fetch_it_quizzes(args.api_key)
    all_questions_csv = []

    for quiz in quizzes:
        print(f"⬇️ Đang lấy câu hỏi cho: {quiz['title']}...")
        questions = fetch_questions_for_quiz(args.api_key, quiz['id'])
        
        for q in questions:
            transformed = transform_question(q, quiz)
            if transformed["options"] != "{}" and transformed["correct_answer"]:
                all_questions_csv.append(transformed)
                
        time.sleep(1) # Tránh hammer API server

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