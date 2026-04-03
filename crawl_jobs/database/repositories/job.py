import psycopg2
from database.models.enums import JobStatus, WorkType

def get_or_create_job_raw(cur, title, jdata, company_raw_id):
    job_url = jdata.get("job_url")
    if job_url:
        cur.execute("SELECT id FROM job_raws WHERE url = %s LIMIT 1", (job_url,))
        row = cur.fetchone()
        if row: return row[0]
    if company_raw_id:
        cur.execute("SELECT id FROM job_raws WHERE title = %s AND company_id = %s LIMIT 1", (title, company_raw_id))
        row = cur.fetchone()
        if row: return row[0]
    query = """
        INSERT INTO job_raws
            (title, description, url, date_posted, skills, crawled_at,
             company_id, salary_min, salary_max, provinces, category, source)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id;
    """
    cur.execute(query, (
        title, jdata.get("description") or "", jdata.get("job_url"), jdata.get("date_posted"), jdata.get("skills"),
        jdata.get("crawled_at"), company_raw_id, jdata.get("salary_min"), jdata.get("salary_max"),
        jdata.get("locations"), jdata.get("category"), jdata.get("source"),
    ))
    return cur.fetchone()[0]

def find_existing_job(cur, title, organization_id, job_url=None):
    if job_url:
        cur.execute("""
            SELECT j.id FROM jobs j
            JOIN job_raws jr ON j.job_raw_id = jr.id
            WHERE jr.url = %s LIMIT 1
        """, (job_url,))
        row = cur.fetchone()
        if row: return row[0], "url"
    cur.execute("SELECT id FROM jobs WHERE title = %s AND organization_id = %s LIMIT 1", (title, organization_id))
    row = cur.fetchone()
    if row: return row[0], "title_org"
    return None, None

def update_job(cur, job_id, jdata, category_id=None):
    cur.execute("""
        UPDATE jobs SET
            description = %s, salary_min = COALESCE(%s, salary_min), 
            salary_max = COALESCE(%s, salary_max), experience_min = COALESCE(%s, experience_min),
            experience_max = COALESCE(%s, experience_max), category_id = COALESCE(%s, category_id),
            updated_at = NOW()
        WHERE id = %s
        """, (
            jdata.get("description") or "", jdata.get("salary_min"), jdata.get("salary_max"),
            jdata.get("experience_min"), jdata.get("experience_max"), category_id, job_id,
        ))

def insert_job(cur, title, jdata, organization_id, job_raw_id, category_id=None):
    cur.execute("""
        INSERT INTO jobs
            (title, description, date_posted, organization_id, created_at, 
             salary_min, salary_max, experience_min, experience_max, end_date, job_raw_id, status, work_type, category_id)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
        """, (
            title, jdata.get("description") or "", jdata.get("date_posted"), organization_id,
            jdata.get("crawled_at"), jdata.get("salary_min"), jdata.get("salary_max"),
            jdata.get("experience_min"), jdata.get("experience_max"), jdata.get("end_date"),
            job_raw_id, JobStatus.ACTIVE, WorkType.ONSITE, category_id,
        ))
    return cur.fetchone()[0]

def get_all_categories(cur):
    cur.execute("SELECT name, id FROM categories")
    rows = cur.fetchall()
    return {row[0]: row[1] for row in rows}
