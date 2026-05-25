import argparse
import json
import sys

import pandas as pd
import psycopg2


def sync_skills(csv_file, db_url):
    print("--- BẮT ĐẦU ĐỒNG BỘ SKILLS ---")
    print(f"Đọc file CSV: {csv_file}")

    # 1. Đọc file CSV và lấy danh sách slug hợp lệ
    try:
        df = pd.read_csv(csv_file)
        if "skill_slug" not in df.columns:
            print("LỖI: File CSV không chứa cột 'skill_slug'.")
            sys.exit(1)

        valid_slugs = set(df["skill_slug"].dropna().tolist())
        print(f"-> Tìm thấy {len(valid_slugs)} skill_slug hợp lệ trong file CSV.")

    except FileNotFoundError:
        print(f"LỖI: Không tìm thấy file tại '{csv_file}'.")
        sys.exit(1)
    except Exception as e:
        print(f"LỖI đọc file CSV: {e}")
        sys.exit(1)

    # 2. Kết nối Database
    conn = None
    conflict_uuids = []  # Mảng chứa UUID thay vì slug

    try:
        print("Đang kết nối PostgreSQL...")
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()

        # 3. Lấy cả 'id' (uuid) và 'slug' từ Database
        cur.execute("SELECT id, slug FROM skills WHERE slug IS NOT NULL;")

        # Tạo Dictionary để map: { "slug_name": "uuid_string" }
        # Ép kiểu id sang chuỗi str() để json.dumps() không bị lỗi serialize UUID object
        db_skills_map = {row[1]: str(row[0]) for row in cur.fetchall()}
        db_slugs = set(db_skills_map.keys())

        print(f"-> Tìm thấy {len(db_slugs)} skill slug trong Database.")

        # 4. Tìm các slug cần xóa
        slugs_to_delete = db_slugs - valid_slugs
        print(
            f"-> Phát hiện {len(slugs_to_delete)} skill không tồn tại trong CSV. Chuẩn bị xóa..."
        )

        if not slugs_to_delete:
            print("=> Database đã đồng bộ hoàn toàn với CSV. Không có gì để xóa.")
            return

        # 5. Thực hiện xóa và thu thập UUID nếu conflict
        deleted_count = 0
        for slug in slugs_to_delete:
            try:
                cur.execute("SAVEPOINT before_delete;")
                cur.execute("DELETE FROM skills WHERE slug = %s;", (slug,))
                cur.execute("RELEASE SAVEPOINT before_delete;")
                deleted_count += 1

            except psycopg2.IntegrityError:
                # Nếu lỗi khóa ngoại, lấy UUID từ Dictionary đã map ở Bước 3
                cur.execute("ROLLBACK TO SAVEPOINT before_delete;")
                conflict_uuids.append(db_skills_map[slug])
            except Exception as e:
                cur.execute("ROLLBACK TO SAVEPOINT before_delete;")
                print(f"Lỗi không xác định khi xóa slug '{slug}': {e}")

        # Commit các thay đổi hợp lệ
        conn.commit()
        print("\n--- KẾT QUẢ ĐỒNG BỘ ---")
        print(f"-> Đã xóa thành công: {deleted_count} skills.")
        print(
            f"-> Xung đột (Không thể xóa do dính Foreign Key): {len(conflict_uuids)} skills."
        )

        # 6. In ra danh sách UUID conflict chuẩn JSON array
        if conflict_uuids:
            print("\n[DANH SÁCH UUID SKILL CONFLICT]")
            print(json.dumps(conflict_uuids))

    except psycopg2.OperationalError as e:
        print(f"LỖI kết nối Database: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"LỖI hệ thống: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            cur.close()
            conn.close()
            print("\nĐã đóng kết nối Database.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Đồng bộ bảng Skills trong PostgreSQL dựa trên file CSV."
    )

    parser.add_argument(
        "--file",
        default=r"..\extract_skills\data\skills_dict.csv",
        help="Đường dẫn đến file CSV (Mặc định: ..\\extract_skills\\data\\skills_dict.csv)",
    )

    parser.add_argument(
        "--db-url",
        required=True,
        help="Chuỗi kết nối PostgreSQL (VD: postgresql://user:pass@host:port/dbname)",
    )

    args = parser.parse_args()
    sync_skills(args.file, args.db_url)
