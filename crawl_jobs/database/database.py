import psycopg2
from psycopg2.extras import Json
import json

from database.models.enums import OrganizationType, WorkType, JobStatus
from helpers.helper import slugify


def _get_or_create_company_raw(cur, name, cdata):
    # check duplicate by website url first
    website = cdata.get("website_url")
    if website:
        cur.execute("SELECT id FROM company_raws WHERE website_url = %s LIMIT 1", (website,))
        row = cur.fetchone()
        if row:
            return row[0]

    # fallback: match by name
    cur.execute("SELECT id FROM company_raws WHERE name = %s LIMIT 1", (name,))
    row = cur.fetchone()
    if row:
        return row[0]

    # not found -> insert
    query = """
        INSERT INTO company_raws
            (name, logo_url, description, address, website_url,
             employees_min, employees_max, source, crawled_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id;
    """
    cur.execute(query, (
        name,
        cdata.get("logo"), cdata.get("description"), cdata.get("address"),
        cdata.get("website_url"), cdata.get("employees_min"), cdata.get("employees_max"),
        cdata.get("source"), cdata.get("crawled_at")
    ))
    return cur.fetchone()[0]


def _get_or_create_organization(cur, name, cdata):
    slug = slugify(name)

    cur.execute("SELECT id FROM organizations WHERE name = %s LIMIT 1", (name,))
    row = cur.fetchone()
    if row:
        return row[0]

    cur.execute(
        """
        INSERT INTO organizations
            (name, slug, logo_url, description, address, website_url, employees_min, employees_max, created_at,
                type, verified_at)
        VALUES (%s ,%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
        """,
        (
            name, slug, cdata.get("logo"), 
            cdata.get("description"), cdata.get("address") or [], 
            cdata.get("website_url"), cdata.get("employees_min"), 
            cdata.get("employees_max"), cdata.get("crawled_at"), 
            OrganizationType.COMPANY, cdata.get("crawled_at")
        ),
    )
    inserted = cur.fetchone()
    if not inserted:
        raise RuntimeError(f"No id returned for organization {name}")
    return inserted[0]


def _insert_organization_location(cur, organization_id, province_id, locations):
    if not locations:
        return

    address_text = ", ".join(locations)
    cur.execute(
        """
        INSERT INTO organization_locations (organization_id, province_id, address)
        VALUES (%s, %s, %s)
        ON CONFLICT DO NOTHING
        """,
        (organization_id, province_id, address_text),
    )


def _insert_company(cur, name, cdata, organization_id, company_raw_id):
    cur.execute("SELECT organization_id FROM companies WHERE organization_id = %s LIMIT 1", (organization_id,))
    row = cur.fetchone()
    if row:
        return row[0]

    cur.execute(
        """
        INSERT INTO companies
            (organization_id, created_at, company_raw_id, company_size)
        VALUES (%s, %s, %s, %s)
        RETURNING organization_id
        """,
        (
            organization_id, cdata.get("crawled_at"),
            company_raw_id, cdata.get("employees_min")
        ),
    )
    inserted = cur.fetchone()
    if not inserted:
        raise RuntimeError(f"No organization_id returned for company {name}")
    return inserted[0]


def _get_or_create_job_raw(cur, title, jdata, company_raw_id):
    job_url = jdata.get("job_url")
    if job_url:
        cur.execute("SELECT id FROM job_raws WHERE url = %s LIMIT 1", (job_url,))
        row = cur.fetchone()
        if row:
            return row[0]

    # fallback: match by title + company_raw_id
    if company_raw_id:
        cur.execute(
            "SELECT id FROM job_raws WHERE title = %s AND company_id = %s LIMIT 1",
            (title, company_raw_id),
        )
        row = cur.fetchone()
        if row:
            return row[0]

    # not found -> insert
    query = """
        INSERT INTO job_raws
            (title, description, url, date_posted, skills, crawled_at,
             company_id, salary_min, salary_max, provinces, category, source)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id;
    """
    cur.execute(query, (
        title, json.dumps(jdata.get("description")), jdata.get("job_url"),
        jdata.get("date_posted"), jdata.get("skills"), jdata.get("crawled_at"),
        company_raw_id, jdata.get("salary_min"), jdata.get("salary_max"),
        jdata.get("locations"), jdata.get("category"), jdata.get("source")
    ))
    return cur.fetchone()[0]


def _insert_job(cur, title, jdata, organization_id, province_id, job_raw_id):
    cur.execute("SELECT id FROM jobs WHERE title = %s AND organization_id = %s", (title, organization_id))
    if cur.fetchone():
        print(f"Job '{title}' already exists for organization '{organization_id}', skipping.")
        return None

    cur.execute(
        """
        INSERT INTO jobs
            (title, description, date_posted, organization_id, province_id, created_at, 
             salary_min, salary_max, experience_min, experience_max, end_date, job_raw_id, status, work_type)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
        """,
        (
            title, Json(jdata.get("description")), jdata.get("date_posted"),
            organization_id, province_id, jdata.get("crawled_at"),
            jdata.get("salary_min"), jdata.get("salary_max"),
            jdata.get("experience_min"), jdata.get("experience_max"),
            jdata.get("end_date"), job_raw_id, JobStatus.ACTIVE, WorkType.ONSITE
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


def get_all_category(db_url):
    conn = psycopg2.connect(db_url)
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT name FROM categories
            """
        )
        rows = cur.fetchall()
        return [row[0] for row in rows]


def _link_job_to_category(cur, job_id, category_id):
    cur.execute(
        """
        INSERT INTO job_categories (job_id, category_id) VALUES (%s, %s)
        ON CONFLICT (job_id, category_id) DO NOTHING
        """,
        (job_id, category_id)
    )


def insert_to_db(db_url: str, companies: dict):
    jobs_inserted = 0
    conn = None
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        for name, cdata in companies.items():
            try:
                # Create a savepoint for this company
                cur.execute("SAVEPOINT company_savepoint")
                
                print(f"Processing company: {name}")

                company_raw_id = _get_or_create_company_raw(cur, name, cdata)
                organization_id = _get_or_create_organization(cur, name, cdata)
                company_id = _insert_company(cur, name, cdata, organization_id, company_raw_id)

                for title, jdata in cdata.get("jobs", {}).items():
                    job_raw_id = _get_or_create_job_raw(cur, title, jdata, company_raw_id)

                    province_id = None
                    if jdata.get("locations"):
                        province_name = next(iter(jdata.get("locations", [])), None)
                        province_id = _get_or_create_province(cur, province_name)

                    _insert_organization_location(cur, organization_id, province_id, cdata.get("address"))

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
                
                # Release savepoint if successful
                cur.execute("RELEASE SAVEPOINT company_savepoint")
                
            except Exception as company_error:
                # Rollback to savepoint - only this company's changes
                cur.execute("ROLLBACK TO SAVEPOINT company_savepoint")
                cur.execute("RELEASE SAVEPOINT company_savepoint")
                print(f"⚠️  Error processing company '{name}': {company_error}")
                print(f"   Skipping company and continuing...")
                continue
        
        cur.close()
        conn.commit()
        print("Import completed for raw and processed data.")
        return jobs_inserted
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Database operation failed: {e}")
        return 0  # Return 0 instead of None to avoid TypeError
    finally:
        if conn:
            conn.close()