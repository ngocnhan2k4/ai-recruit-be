import psycopg2
from psycopg2.extras import Json

def _insert_company_raw(cur, name, cdata):
    query = """
        INSERT INTO company_raws
            (name, logo_url, description, address, website_url,
             employees_min, employees_max, source, crawled_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id;
    """
    cur.execute(query, (
        name,
        cdata.get("logo"),
        cdata.get("description"),
        cdata.get("address"),
        cdata.get("website_url"),
        cdata.get("employees_min"),
        cdata.get("employees_max"),
        cdata.get("source"),
        cdata.get("crawled_at")
    ))
    return cur.fetchone()[0]


def _get_or_create_company(cur, name, cdata, company_raw_id):
    cur.execute("SELECT id FROM companies WHERE name = %s LIMIT 1", (name,))
    row = cur.fetchone()
    if row:
        return row[0]

    cur.execute(
        """
        INSERT INTO companies
            (name, logo_url, description, address, website_url, 
             employees_min, employees_max, created_at, company_raw_id)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
        """,
        (
            name, cdata.get("logo"), cdata.get("description"),
            cdata.get("address") or [], cdata.get("website_url"),
            cdata.get("employees_min"), cdata.get("employees_max"),
            cdata.get("crawled_at"), company_raw_id
        ),
    )
    inserted = cur.fetchone()
    if not inserted:
        raise RuntimeError(f"No id returned for company {name}")
    return inserted[0]


def _insert_job_raw(cur, title, jdata, company_raw_id):
    query = """
        INSERT INTO job_raws
            (title, description, url, date_posted, skills, crawled_at,
             company_id, salary_min, salary_max, provinces, category, source)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id;
    """
    cur.execute(query, (
        title, Json(jdata.get("description")), jdata.get("url"),
        jdata.get("date_posted"), jdata.get("skills"),
        jdata.get("crawled_at"), company_raw_id, jdata.get("salary_min"),
        jdata.get("salary_max"), jdata.get("locations"),
        jdata.get("category"), jdata.get("source")
    ))
    return cur.fetchone()[0]


def _insert_job(cur, title, jdata, company_id, province_id, job_raw_id):
    cur.execute("SELECT id FROM jobs WHERE title = %s AND company_id = %s", (title, company_id))
    if cur.fetchone():
        print(f"Job '{title}' already exists for company '{company_id}', skipping.")
        return None

    cur.execute(
        """
        INSERT INTO jobs
            (title, description, date_posted, company_id, province_id, created_at, 
             salary_min, salary_max, experience_min, experience_max, end_date, job_raw_id)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
        """,
        (
            title, Json(jdata.get("description")), jdata.get("date_posted"),
            company_id, province_id, jdata.get("crawled_at"),
            jdata.get("salary_min"), jdata.get("salary_max"),
            jdata.get("experience_min"), jdata.get("experience_max"),
            jdata.get("end_date"), job_raw_id
        ),
    )
    return cur.fetchone()[0]


def _get_or_create_province(cur, province_name):
    if not province_name:
        return None

    cur.execute("SELECT id FROM provinces WHERE name ILIKE %s LIMIT 1", (f"%{province_name}%",))
    row = cur.fetchone()
    if row:
        return row[0]

    cur.execute("INSERT INTO provinces (name) VALUES (%s) RETURNING id", (province_name,))
    return cur.fetchone()[0]


def _get_or_create_skill(cur, skill_name):
    cur.execute("SELECT id FROM skills WHERE LOWER(name) = LOWER(%s) LIMIT 1", (skill_name,))
    row = cur.fetchone()
    if row:
        return row[0]

    cur.execute("INSERT INTO skills (name) VALUES (%s) RETURNING id", (skill_name,))
    return cur.fetchone()[0]


def _link_job_to_skill(cur, job_id, skill_id):
    cur.execute("SELECT 1 FROM job_skills WHERE job_id = %s AND skill_id = %s", (job_id, skill_id))
    if not cur.fetchone():
        cur.execute("INSERT INTO job_skills (job_id, skill_id) VALUES (%s, %s)", (job_id, skill_id))


def _get_or_create_category(cur, category_name):
    cur.execute(
        """
        INSERT INTO categories (name) VALUES (%s)
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
        """,
        (category_name,)
    )
    return cur.fetchone()[0]


def _link_job_to_category(cur, job_id, category_id):
    cur.execute(
        """
        INSERT INTO job_categories (job_id, category_id) VALUES (%s, %s)
        ON CONFLICT (job_id, category_id) DO NOTHING
        """,
        (job_id, category_id)
    )


def insert_to_db(db_url: str, companies: dict, source: str):
    jobs_inserted = 0
    conn = None
    try:
        conn = psycopg2.connect(db_url)
        with conn.cursor() as cur:
            for name, cdata in companies.items():
                print(f"Processing company: {name}")

                company_raw_id = _insert_company_raw(cur, name, cdata)
                company_id = _get_or_create_company(cur, name, cdata, company_raw_id)

                for title, jdata in cdata.get("jobs", {}).items():
                    job_raw_id = _insert_job_raw(cur, title, jdata, company_raw_id)

                    province_id = None
                    if jdata.get("locations"):
                        province_name = next(iter(jdata.get("locations", [])), None)
                        province_id = _get_or_create_province(cur, province_name)

                    job_id = _insert_job(cur, title, jdata, company_id, province_id, job_raw_id)
                    if not job_id:
                        continue
                    
                    jobs_inserted += 1

                    if jdata.get("category"):
                        category_id = _get_or_create_category(cur, jdata["category"])
                        _link_job_to_category(cur, job_id, category_id)

                    for skill in jdata.get("skills", []):
                        skill_id = _get_or_create_skill(cur, skill)
                        _link_job_to_skill(cur, job_id, skill_id)
                        
        conn.commit()
        print("Import completed for raw and processed data.")
        return jobs_inserted
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Database operation failed: {e}")
    finally:
        if conn:
            conn.close()