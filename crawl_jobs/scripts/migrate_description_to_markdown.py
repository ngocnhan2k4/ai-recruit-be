"""
Migration script: Convert JSON description to Markdown in jobs and job_raws tables.
Updates:
- Handles standard list format: [{"title": "...", "body": "..."}]
- Handles flat dict format: {"description": "...", "requirements": "...", "benefits": "..."}
- Fixes formatting (stuck bullets, stuck numbers).
"""

import json
import os
import re
import sys

import psycopg2
from dotenv import load_dotenv

load_dotenv()


def json_to_markdown(description) -> str:
    """Convert a JSON description to Markdown string."""
    if description is None:
        return ""

    # 1. Parse JSON if it's a string
    if isinstance(description, str):
        description = description.strip()
        if not description:
            return ""
        try:
            parsed = json.loads(description)
        except (json.JSONDecodeError, TypeError):
            # Already plain text -> Clean it up
            return _clean_body_text(description)
    else:
        parsed = description

    # 2. Handle List (Standard format)
    if isinstance(parsed, list):
        return _convert_parts_to_markdown(parsed)

    # 3. Handle Dict (Various formats)
    if isinstance(parsed, dict):
        return _convert_dict_to_markdown(parsed)

    return str(parsed)


def _convert_dict_to_markdown(data: dict) -> str:
    """
    Handle dictionary inputs with 3 strategies:
    1. Standard: {"title": "...", "body": "..."}
    2. Known Keys: {"description": "...", "requirements": "..."}
    3. Fallback: {"any_key": "..."} -> ## Any Key
    """
    # Strategy 1: Standard single part (format cũ của crawler)
    if "title" in data and "body" in data:
        return _convert_parts_to_markdown([data])

    # Strategy 2: Map specific known keys (format dẹp/flat)
    key_mapping = {
        "description": "Mô tả công việc",
        "job_description": "Mô tả công việc",
        "requirements": "Yêu cầu công việc",
        "job_requirements": "Yêu cầu công việc",
        "requirement": "Yêu cầu công việc",
        "benefits": "Quyền lợi",
        "job_benefits": "Quyền lợi",
        "benefit": "Quyền lợi"
    }

    sections = []
    
    # Danh sách các key đã được xử lý để tránh trùng lặp
    processed_keys = set()

    # Ưu tiên hiển thị các key chuẩn theo thứ tự đẹp
    order = ["description", "job_description", 
             "requirements", "job_requirements", "requirement",
             "benefits", "job_benefits", "benefit"]

    for key in order:
        if key in data and data[key]:
            content = _clean_body_text(str(data[key]))
            if content:
                header = key_mapping.get(key, "Thông tin khác")
                sections.append(f"## {header}\n\n{content}")
                processed_keys.add(key)

    # Strategy 3 (FIX CHO BẠN): Fallback cho các key lạ (như additionalProp1)
    # Nếu Strategy 2 không tìm thấy gì, hoặc vẫn còn các key khác chưa được xử lý
    for key, value in data.items():
        # Bỏ qua nếu key đã xử lý ở trên hoặc value rỗng
        if key in processed_keys or not value:
            continue
            
        content = _clean_body_text(str(value))
        if not content:
            continue
            
        # Format key thành Header đẹp hơn (ví dụ: "additionalProp1" -> "AdditionalProp1")
        # Hoặc bạn có thể dùng key.replace("_", " ").title() để đẹp hơn nữa
        header = key[0].upper() + key[1:] if key else "Info"
        
        # Thêm vào danh sách section
        sections.append(f"## {header}\n\n{content}")

    return "\n\n".join(sections).strip()


def _convert_parts_to_markdown(parts: list) -> str:
    """Convert list of {title, body} dicts to Markdown."""
    if not parts:
        return ""

    sections = []

    for part in parts:
        if not isinstance(part, dict):
            sections.append(str(part))
            continue

        title = (part.get("title") or "").strip().rstrip(":")
        body = (part.get("body") or "").strip()

        if not title and not body:
            continue

        if title == "N/A" and body == "N/A":
            continue

        section_parts = []

        if title and title != "N/A":
            section_parts.append(f"## {title}")

        if body and body != "N/A":
            cleaned_body = _clean_body_text(body)
            section_parts.append(cleaned_body)

        if section_parts:
            sections.append("\n\n".join(section_parts))

    return "\n\n".join(sections).strip()


def _clean_body_text(body: str) -> str:
    """Clean up body text using Regex."""
    if not body:
        return ""

    # 1. Replace literal "\n" strings
    text = body.replace("\\n", "\n")

    # 2. Fix stuck bullet points (e.g. "text- Item" -> "text\n- Item")
    text = re.sub(r"(?<=[^\n])\s*([•\-+])\s+", r"\n\1 ", text)

    # 3. Fix stuck numbered lists (e.g. "text1. Item" -> "text\n1. Item")
    # Only if followed by Uppercase to avoid version numbers (v1.2)
    text = re.sub(r"(?<=[^\n])\s*(\d+\.)\s+(?=[A-ZÀ-Ỹ])", r"\n\1 ", text)

    # 4. Fix missing space after sentences
    text = re.sub(r"([a-z])\.([A-Z])", r"\1. \2", text)

    # 5. Clean excessive newlines
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


def migrate_jobs_table(cur, dry_run=False):
    print("\n" + "=" * 60)
    print("📦 Migrating jobs table...")
    print("=" * 60)

    cur.execute("SELECT id, title, description FROM jobs WHERE description IS NOT NULL")
    rows = cur.fetchall()

    converted = 0
    skipped = 0
    errors = 0

    for job_id, title, description in rows:
        try:
            # Skip if strict string check fails (optional, depending on your DB data)
            # But let's allow it to try parsing anything that looks like JSON or Dict

            markdown = json_to_markdown(description)

            # Additional check: If markdown is empty but description wasn't, count as skipped
            if not markdown and description:
                skipped += 1
                continue

            # Logic to avoid rewriting if it's already markdown (heuristic)
            # If input was string, didn't start with { or [, and output is same -> skip
            if isinstance(description, str):
                cleaned_input = description.strip()
                if not (cleaned_input.startswith("{") or cleaned_input.startswith("[")):
                    # It was likely already text.
                    # Only update if _clean_body_text changed something (e.g. fixed stuck bullets)
                    if markdown == _clean_body_text(description):
                        # If it's just a text cleanup, we count it as converted/updated
                        pass

            if dry_run:
                # Print sample for verification
                if converted < 3:
                    print(f"✅ [{job_id[:8]}] {title[:30]}...")
            else:
                cur.execute(
                    "UPDATE jobs SET description = %s WHERE id = %s", (markdown, job_id)
                )
            converted += 1

        except Exception as e:
            errors += 1
            print(f"❌ Error [{job_id[:8]}]: {e}")

    print(f"Result: {converted} converted, {skipped} skipped, {errors} errors.")
    return converted, skipped, errors


def migrate_job_raws_table(cur, dry_run=False):
    print("\n" + "=" * 60)
    print("📦 Migrating job_raws table...")
    print("=" * 60)

    cur.execute(
        "SELECT id, title, description FROM job_raws WHERE description IS NOT NULL"
    )
    rows = cur.fetchall()

    converted = 0
    skipped = 0
    errors = 0

    for raw_id, title, description in rows:
        try:
            markdown = json_to_markdown(description)

            if not markdown and description:
                skipped += 1
                continue

            if not dry_run:
                cur.execute(
                    "UPDATE job_raws SET description = %s WHERE id = %s",
                    (markdown, raw_id),
                )
            converted += 1
        except Exception:
            errors += 1

    print(f"Result: {converted} converted, {skipped} skipped, {errors} errors.")
    return converted, skipped, errors


def main():
    dry_run = "--dry-run" in sys.argv
    if dry_run:
        print("🔍 DRY RUN MODE")

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL missing")
        return

    conn = psycopg2.connect(database_url)
    try:
        cur = conn.cursor()
        migrate_jobs_table(cur, dry_run)
        migrate_job_raws_table(cur, dry_run)

        if not dry_run:
            conn.commit()
            print("\n✅ All changes committed.")
        else:
            print("\n🔍 Dry run finished. No changes.")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error: {e}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
