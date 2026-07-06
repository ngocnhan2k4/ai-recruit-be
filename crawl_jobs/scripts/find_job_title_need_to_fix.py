import os
import re
import sys
from collections import Counter
import psycopg2

def find_normalized_split_candidates():
    print("--- SCANNING FOR CANDIDATES SPLIT BY NORMALIZE_TEXT (READ-ONLY) ---")
    
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
    
    urls_to_process = []
    if db_dev_url:
        urls_to_process.append(("DEV DB", db_dev_url))
    if db_prod_url:
        urls_to_process.append(("PROD DB", db_prod_url))
        
    if not urls_to_process:
        print("ERROR: No database URLs found in environment variables.")
        sys.exit(1)

    # 1. Pattern bắt lỗi tách dấu câu (VD: ". Net", "! Ops") -> 100% là lỗi tách
    punct_split_re = re.compile(r'\b([.!?;:,])\s+([A-ZÀ-ỸĐ][a-zà-ỹđ0-9+#]*)\b')

    # 2. Pattern bắt lỗi tách CamelCase (VD: "Dev Ops", "i OS", "Vue Js", "Java Script")
    # Chúng ta bắt các cặp từ: [Từ kết thúc bằng chữ thường] + [Space] + [Từ bắt đầu bằng chữ hoa]
    camel_split_re = re.compile(r'\b([a-zA-Zà-ỹđ]{1,10})\s+([A-ZÀ-ỸĐ][a-zA-Zà-ỹđ0-9+#]{1,10})\b')

    # Danh sách các từ phổ biến trong Title Case chuẩn (để bỏ qua, tránh nhiễu log)
    # Bạn có thể bổ sung thêm các từ phổ biến trong data của bạn vào đây
    common_valid_words = {
        'senior', 'junior', 'software', 'engineer', 'developer', 'manager', 'product', 
        'project', 'business', 'analyst', 'data', 'quality', 'assurance', 'technical', 
        'lead', 'head', 'director', 'executive', 'specialist', 'consultant', 'support',
        'chuyên', 'viên', 'nhân', 'kinh', 'doanh', 'quản', 'lý', 'phát', 'triển',
        'khách', 'hàng', 'giám', 'đốc', 'trưởng', 'phó', 'phòng', 'thực', 'tập'
    }

    tables_to_scan = ['jobs', 'job_raws']

    for env_name, db_url in urls_to_process:
        print(f"\n==========================================")
        print(f"Scanning {env_name}...")
        print(f"==========================================")
        conn = None
        try:
            conn = psycopg2.connect(db_url)
            conn.readonly = True  # Đảm bảo an toàn tuyệt đối, chỉ đọc
            cur = conn.cursor()
            
            for table in tables_to_scan:
                print(f"\n--- Scanning table: {table} ---")
                cur.execute(f"SELECT id, title FROM {table} WHERE title IS NOT NULL;")
                rows = cur.fetchall()
                
                punct_matches = Counter()
                camel_matches = Counter()
                sample_records = {} # Lưu sample ID cho từng cụm từ tìm được

                for row_id, title in rows:
                    # 1. Quét lỗi tách bởi dấu câu (. Net)
                    for match in punct_split_re.findall(title):
                        bad_token = f"{match[0]} {match[1]}"
                        punct_matches[bad_token] += 1
                        if bad_token not in sample_records:
                            sample_records[bad_token] = (row_id, title)

                    # 2. Quét lỗi tách CamelCase
                    for w1, w2 in camel_split_re.findall(title):
                        # Nếu từ w1 hoặc w2 là từ vựng thông thường trong job title -> Bỏ qua
                        if w1.lower() in common_valid_words or w2.lower() in common_valid_words:
                            continue
                        
                        # Heuristic lọc từ nghi vấn:
                        # Thường từ bị tách có ít nhất 1 từ ngắn (như Dev, Ops, Js, i, Vue, Git, Hub, Sec...)
                        # hoặc ghép lại nhìn giống từ công nghệ (len <= 12)
                        if len(w1) <= 5 or len(w2) <= 5 or (len(w1) + len(w2) <= 12):
                            bad_token = f"{w1} {w2}"
                            camel_matches[bad_token] += 1
                            if bad_token not in sample_records:
                                sample_records[bad_token] = (row_id, title)

                # Output kết quả gom nhóm
                print(f"\n[!] 1. Punctuation split candidates (e.g., '. Net'):")
                if not punct_matches:
                    print("    None found.")
                for token, count in punct_matches.most_common(20):
                    sid, stitle = sample_records[token]
                    print(f"    - '{token}' (Found {count} times) -> Sample ID {sid}: \"{stitle}\"")

                print(f"\n[!] 2. CamelCase split candidates (Suspicious short/tech words):")
                if not camel_matches:
                    print("    None found.")
                for token, count in camel_matches.most_common(50):
                    sid, stitle = sample_records[token]
                    suggested_fix = token.replace(" ", "")
                    print(f"    - '{token}' -> '{suggested_fix}'? (Found {count} times) | Sample ID {sid}: \"{stitle}\"")

        except Exception as e:
            print(f"Error scanning {env_name}: {e}")
        finally:
            if conn:
                cur.close()
                conn.close()

if __name__ == "__main__":
    find_normalized_split_candidates()