import argparse
import re
import sys

import pandas as pd
import psycopg2
from bs4 import BeautifulSoup
from psycopg2.extras import execute_values
from tqdm import tqdm
from transformers import pipeline


def clean_text(html_content):
    """Làm sạch Markdown, HTML và khoảng trắng"""
    if pd.isna(html_content) or not html_content:
        return ""
    text_no_markdown = re.sub(r"^#+.*$", "", str(html_content), flags=re.MULTILINE)
    soup = BeautifulSoup(text_no_markdown, "html.parser")
    pure_text = soup.get_text(separator=" ")
    return re.sub(r"\s+", " ", pure_text).strip()


def make_slug(text):
    slug = text.lower()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")


def extract_skills_from_text(
    text,
    ner_pipeline,
    strict_pattern,
    skill_mapper,
    pending_mappings,
    new_skills_to_insert,
    job_id,
):
    """Hàm Helper để chạy NER pipeline và quy đổi ID"""
    clean_desc = clean_text(text)
    if not clean_desc:
        return set()

    try:
        entities = ner_pipeline(clean_desc)
    except Exception as e:
        tqdm.write(f"⚠️ Prediction failed for text snippet in job {job_id}: {e}")
        return set()

    raw_skills = [
        ent["word"]
        for ent in entities
        if ent["entity_group"] in ["LABEL_1", "LABEL_2", "B-SKILL", "I-SKILL"]
    ]

    predicted_master_ids = set()
    for raw_word in raw_skills:
        clean_words = strict_pattern.findall(raw_word)
        for cw in clean_words:
            if 2 < len(cw) <= 20:
                word_lower = cw.lower()

                if word_lower in skill_mapper:
                    predicted_master_ids.add(skill_mapper[word_lower])
                else:
                    slug = make_slug(cw)
                    if not slug:
                        continue

                    if slug in skill_mapper:
                        predicted_master_ids.add(skill_mapper[slug])
                    else:
                        new_skills_to_insert[slug] = cw
                        pending_mappings.append((job_id, slug))

    return predicted_master_ids


def main():
    parser = argparse.ArgumentParser(
        description="Sync Job Skills from CSV export using NER Pipeline."
    )
    parser.add_argument("--db-url", required=True, help="PostgreSQL Connection String")
    parser.add_argument(
        "--model-path",
        default="tienminhktvn/extract-skills-model",
        help="Path to the trained NER model",
    )
    parser.add_argument(
        "--input-file",
        default="./data/jobs_export.csv",
        help="Path to the jobs CSV file exported from DB",
    )
    parser.add_argument(
        "--batch-size", type=int, default=100, help="Jobs per batch (default: 100)"
    )
    parser.add_argument(
        "--offset", type=int, default=0, help="Skip N first jobs in CSV (default: 0)"
    )

    args = parser.parse_args()

    # 1. LOAD MODEL
    print(f"🚀 Loading model from: {args.model_path} ...")
    try:
        ner_pipeline = pipeline(
            "ner",
            model=args.model_path,
            tokenizer=args.model_path,
            aggregation_strategy="simple",
        )
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        sys.exit(1)

    # 2. CONNECT DB & LOAD DICTIONARY
    try:
        print("🔗 Connecting to PostgreSQL...")
        conn = psycopg2.connect(args.db_url)
        conn.autocommit = False
        cur = conn.cursor()

        print("📥 Loading Master Skills and Synonyms into memory...")
        cur.execute("""
            SELECT s.id, s.slug, s.name, ss.alias_name
            FROM skills s
            LEFT JOIN skills_synonyms ss ON s.id = ss.master_skill_id;
        """)

        skill_mapper = {}
        for row in cur.fetchall():
            master_id = str(row[0])
            master_slug = str(row[1]) if row[1] else ""
            master_name = str(row[2]) if row[2] else ""
            alias_name = str(row[3]) if row[3] else ""

            if master_slug:
                skill_mapper[master_slug.lower()] = master_id
            if master_name:
                skill_mapper[master_name.lower()] = master_id
            if alias_name:
                skill_mapper[alias_name.lower()] = master_id

        print(f"✅ Loaded {len(skill_mapper)} mapping rules into RAM.")

    except Exception as e:
        print(f"❌ DB Connection Error: {e}")
        sys.exit(1)

    # 3. READ DATA FROM CSV
    print(f"📂 Reading data from CSV: {args.input_file} ...")
    try:
        df_jobs = pd.read_csv(args.input_file)
        # Điền chuỗi rỗng vào các ô NaN để tránh lỗi xử lý String
        df_jobs = df_jobs.fillna("")

        req_cols = [
            "id",
            "title",
            "description",
            "existing_skill_names",
            "existing_skill_ids",
        ]
        for col in req_cols:
            if col not in df_jobs.columns:
                print(f"❌ CSV is missing required column: {col}")
                sys.exit(1)

        total_csv_rows = len(df_jobs)
        if args.offset > 0:
            print(f"⏭️ Applying offset: Skipping first {args.offset} rows.")
            df_jobs = df_jobs.iloc[args.offset :]

        print(
            f"✅ Found {len(df_jobs)} jobs to process (Total in CSV: {total_csv_rows})."
        )

    except FileNotFoundError:
        print(f"❌ Error: File '{args.input_file}' not found.")
        sys.exit(1)

    # 4. BATCH PROCESSING (TWO-PHASE PREDICTION)
    strict_pattern = re.compile(r"[A-Za-z0-9+#\-\.]+")

    # Chia DataFrame thành các chunks
    chunks = [
        df_jobs.iloc[i : i + args.batch_size]
        for i in range(0, len(df_jobs), args.batch_size)
    ]

    for batch_idx, batch_df in enumerate(
        tqdm(chunks, desc="Processing Batches", unit="batch")
    ):
        new_skills_to_insert = {}
        pending_mappings = []
        to_insert_tuples = []
        to_delete_tuples = []

        for _, row in batch_df.iterrows():
            job_id = str(row["id"])
            title = str(row["title"])
            desc = str(row["description"])
            existing_names = str(row["existing_skill_names"])
            existing_ids_str = str(row["existing_skill_ids"])

            # Phân tách chuỗi "uuid1,uuid2" thành tập hợp set()
            existing_ids_set = set(
                [x.strip() for x in existing_ids_str.split(",") if x.strip()]
            )

            # PHA 1: Chạy mô hình trên Job Description
            phase1_ids = extract_skills_from_text(
                text=desc,
                ner_pipeline=ner_pipeline,
                strict_pattern=strict_pattern,
                skill_mapper=skill_mapper,
                pending_mappings=pending_mappings,
                new_skills_to_insert=new_skills_to_insert,
                job_id=job_id,
            )

            # PHA 2: Chạy mô hình trên Title + Existing Skills
            context_string = f"{title}. Skills required: {existing_names}."
            phase2_ids = extract_skills_from_text(
                text=context_string,
                ner_pipeline=ner_pipeline,
                strict_pattern=strict_pattern,
                skill_mapper=skill_mapper,
                pending_mappings=pending_mappings,
                new_skills_to_insert=new_skills_to_insert,
                job_id=job_id,
            )

            # HỢP NHẤT KẾT QUẢ
            combined_predicted_ids = phase1_ids.union(phase2_ids)

            # DIFFING LOGIC
            insert_set = combined_predicted_ids - existing_ids_set
            to_insert_tuples.extend([(job_id, s_id) for s_id in insert_set])

            delete_set = existing_ids_set - combined_predicted_ids
            to_delete_tuples.extend([(job_id, d_id) for d_id in delete_set])

        # 4.2. Database Operations
        try:
            # A. Thêm kỹ năng mới
            if new_skills_to_insert:
                upsert_query = """
                    INSERT INTO skills (name, slug) VALUES %s
                    ON CONFLICT (slug) DO UPDATE SET updated_at = NOW()
                    RETURNING id, slug;
                """
                returned_records = execute_values(
                    cur,
                    upsert_query,
                    [(name, slug) for slug, name in new_skills_to_insert.items()],
                    fetch=True,
                )

                for r_id, r_slug in returned_records:
                    skill_mapper[r_slug] = str(r_id)

                for j_id, slug in pending_mappings:
                    if slug in skill_mapper:
                        to_insert_tuples.append((j_id, skill_mapper[slug]))

            # B. BULK DELETE (Xóa các relation không còn hợp lệ)
            if to_delete_tuples:
                delete_query = """
                    DELETE FROM job_skills AS js
                    USING (VALUES %s) AS v(j_id, s_id)
                    WHERE js.job_id = v.j_id::uuid AND js.skill_id = v.s_id::uuid;
                """
                execute_values(cur, delete_query, to_delete_tuples, template="(%s, %s)")

            # C. BULK INSERT (Thêm relation mới)
            if to_insert_tuples:
                insert_mapping_query = """
                    INSERT INTO job_skills (job_id, skill_id) VALUES %s
                    ON CONFLICT (job_id, skill_id) DO NOTHING;
                """
                execute_values(
                    cur,
                    insert_mapping_query,
                    to_insert_tuples,
                    template="(%s::uuid, %s::uuid)",
                )

            conn.commit()

        except psycopg2.Error as e:
            conn.rollback()
            tqdm.write(f"❌ DB Error in batch {batch_idx}: {e}")
            continue
        except Exception as e:
            conn.rollback()
            tqdm.write(f"❌ Unexpected Error in batch {batch_idx}: {e}")
            break

    print("\n🎉 CSV Sync Pipeline Finished Successfully!")
    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
