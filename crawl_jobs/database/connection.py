import psycopg2
from database.models.enums import JobStatus, OrganizationType, WorkType
from helpers.province import get_standard_province_name
from helpers.text import slugify


def _get_or_create_company_raw(cur, name, cdata):
    # check duplicate by website url first
    website = cdata.get("website_url")
    if website:
        cur.execute(
            "SELECT id FROM company_raws WHERE website_url = %s LIMIT 1", (website,)
        )
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
    cur.execute(
        query,
        (
            name,
            cdata.get("logo"),
            cdata.get("description"),
            cdata.get("address"),
            cdata.get("website_url"),
            cdata.get("employees_min"),
            cdata.get("employees_max"),
            cdata.get("source"),
            cdata.get("crawled_at"),
        ),
    )
    return cur.fetchone()[0]


def _get_or_create_organization(cur, name, cdata):
    """Get existing organization or create a new one.

    Checks by both name and slug to avoid duplicate key errors,
    since slug has a unique constraint.
    """
    slug = slugify(name)

    # First check by name
    cur.execute("SELECT id FROM organizations WHERE name = %s LIMIT 1", (name,))
    row = cur.fetchone()
    if row:
        return row[0]

    # Also check by slug (unique constraint)
    cur.execute("SELECT id FROM organizations WHERE slug = %s LIMIT 1", (slug,))
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
            name,
            slug,
            cdata.get("logo"),
            cdata.get("description"),
            cdata.get("address") or [],
            cdata.get("website_url"),
            cdata.get("employees_min"),
            cdata.get("employees_max"),
            cdata.get("crawled_at"),
            OrganizationType.COMPANY,
            cdata.get("crawled_at"),
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
    cur.execute(
        "SELECT organization_id FROM companies WHERE organization_id = %s LIMIT 1",
        (organization_id,),
    )
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
            organization_id,
            cdata.get("crawled_at"),
            company_raw_id,
            cdata.get("employees_min"),
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
    cur.execute(
        query,
        (
            title,
            jdata.get("description") or "",
            jdata.get("job_url"),
            jdata.get("date_posted"),
            jdata.get("skills"),
            jdata.get("crawled_at"),
            company_raw_id,
            jdata.get("salary_min"),
            jdata.get("salary_max"),
            jdata.get("locations"),
            jdata.get("category"),
            jdata.get("source"),
        ),
    )
    return cur.fetchone()[0]


def _find_existing_job(cur, title, organization_id, job_url=None):
    """Find an existing job by title+organization or job URL.

    Returns:
        tuple: (job_id, match_type) or (None, None) if not found
    """
    # First try to match by job URL (most accurate)
    if job_url:
        cur.execute(
            """
            SELECT j.id FROM jobs j
            JOIN job_raws jr ON j.job_raw_id = jr.id
            WHERE jr.url = %s LIMIT 1
        """,
            (job_url,),
        )
        row = cur.fetchone()
        if row:
            return row[0], "url"

    # Fallback: match by title + organization
    cur.execute(
        "SELECT id FROM jobs WHERE title = %s AND organization_id = %s LIMIT 1",
        (title, organization_id),
    )
    row = cur.fetchone()
    if row:
        return row[0], "title_org"

    return None, None


def _update_job(cur, job_id, jdata, province_ids, category_id=None):
    """Update an existing job with new crawled data.

    Updates description, salary, experience, and re-links provinces and skills.
    """
    # Update job fields
    cur.execute(
        """
        UPDATE jobs SET
            description = %s,
            salary_min = COALESCE(%s, salary_min),
            salary_max = COALESCE(%s, salary_max),
            experience_min = COALESCE(%s, experience_min),
            experience_max = COALESCE(%s, experience_max),
            category_id = COALESCE(%s, category_id),
            updated_at = NOW()
        WHERE id = %s
        """,
        (
            jdata.get("description") or "",
            jdata.get("salary_min"),
            jdata.get("salary_max"),
            jdata.get("experience_min"),
            jdata.get("experience_max"),
            category_id,
            job_id,
        ),
    )

    # Re-link provinces (clear existing and add new)
    if province_ids:
        cur.execute("DELETE FROM job_provinces WHERE job_id = %s", (job_id,))
        for province_id in province_ids:
            if province_id:
                cur.execute(
                    "INSERT INTO job_provinces (job_id, province_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                    (job_id, province_id),
                )

    # Re-link skills (clear existing and add new from jdata)
    skills = jdata.get("skills", [])
    if skills:
        cur.execute("DELETE FROM job_skills WHERE job_id = %s", (job_id,))
        for skill_name in skills:
            skill_id = _get_or_create_skill(cur, skill_name)
            cur.execute(
                "INSERT INTO job_skills (job_id, skill_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                (job_id, skill_id),
            )

    return True


def _insert_job(
    cur, title, jdata, organization_id, job_raw_id, category_id=None, update_mode=False
):
    """Insert a job into the jobs table or update if exists (based on mode).

    Args:
        cur: Database cursor
        title: Job title
        jdata: Job data dictionary
        organization_id: Organization UUID
        job_raw_id: Job raw ID
        category_id: Category UUID (optional)
        update_mode: If True, update existing jobs instead of skipping

    Returns:
        tuple: (job_id, action) where action is 'inserted', 'updated', or 'skipped'
    """
    job_url = jdata.get("job_url")
    existing_id, match_type = _find_existing_job(cur, title, organization_id, job_url)

    if existing_id:
        if update_mode:
            # Get province IDs for update
            province_ids = []
            if jdata.get("locations"):
                for province_name in jdata.get("locations", []):
                    province_id = _find_province(cur, province_name)
                    if province_id:
                        province_ids.append(province_id)

            _update_job(cur, existing_id, jdata, province_ids, category_id)
            print(f"  ↻ Updated '{title}' (matched by {match_type})")
            return existing_id, "updated"
        else:
            print(f"  ⊘ Skipped '{title}' (already exists)")
            return None, "skipped"

    # Insert new job
    cur.execute(
        """
        INSERT INTO jobs
            (title, description, date_posted, organization_id, created_at, 
             salary_min, salary_max, experience_min, experience_max, end_date, job_raw_id, status, work_type, category_id)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
        """,
        (
            title,
            jdata.get("description") or "",
            jdata.get("date_posted"),
            organization_id,
            jdata.get("crawled_at"),
            jdata.get("salary_min"),
            jdata.get("salary_max"),
            jdata.get("experience_min"),
            jdata.get("experience_max"),
            jdata.get("end_date"),
            job_raw_id,
            JobStatus.ACTIVE,
            WorkType.ONSITE,
            category_id,
        ),
    )
    job_id = cur.fetchone()[0]
    print(f"  ✓ Inserted '{title}'")
    return job_id, "inserted"


def _find_province(cur, province_name):
    """Find a province by name. Does NOT create new provinces.

    The provinces table is fixed — only lookup is allowed.
    Uses the alias map from province.py to normalize crawled names
    before querying the database.

    Args:
        cur: Database cursor
        province_name: Raw province name from crawler

    Returns:
        Province UUID if found, None otherwise
    """
    if not province_name:
        return None

    # Normalize the crawled name to the canonical DB name
    standard_name = get_standard_province_name(province_name)

    # 1. Try exact match with the standardized name
    cur.execute(
        "SELECT id FROM provinces WHERE name ILIKE %s LIMIT 1", (standard_name,)
    )
    row = cur.fetchone()
    if row:
        return row[0]

    # 2. Try contains match as last resort
    cur.execute(
        "SELECT id FROM provinces WHERE name ILIKE %s LIMIT 1",
        (f"%{standard_name}%",),
    )
    row = cur.fetchone()
    if row:
        return row[0]

    # Not found — do NOT create a new province
    print(
        f"  ⚠ Province not found in DB: '{province_name}' (normalized: '{standard_name}')"
    )
    return None


def _get_or_create_skill(cur, skill_name):
    cur.execute(
        "SELECT id FROM skills WHERE LOWER(name) = LOWER(%s) LIMIT 1", (skill_name,)
    )
    row = cur.fetchone()
    if row:
        return row[0]

    cur.execute("INSERT INTO skills (name) VALUES (%s) RETURNING id", (skill_name,))
    return cur.fetchone()[0]


def _link_job_to_skill(cur, job_id, skill_id):
    cur.execute(
        "SELECT 1 FROM job_skills WHERE job_id = %s AND skill_id = %s",
        (job_id, skill_id),
    )
    if not cur.fetchone():
        cur.execute(
            "INSERT INTO job_skills (job_id, skill_id) VALUES (%s, %s)",
            (job_id, skill_id),
        )


def _link_job_to_provinces(cur, job_id, province_ids):
    """Link a job to multiple provinces via the job_provinces junction table.

    Args:
        cur: Database cursor
        job_id: UUID of the job
        province_ids: List of province UUIDs
    """
    if not province_ids or not job_id:
        return

    for province_id in province_ids:
        if province_id:
            cur.execute(
                "SELECT 1 FROM job_provinces WHERE job_id = %s AND province_id = %s",
                (job_id, province_id),
            )
            if not cur.fetchone():
                cur.execute(
                    "INSERT INTO job_provinces (job_id, province_id) VALUES (%s, %s)",
                    (job_id, province_id),
                )


def _get_or_create_category(cur, category_name):
    cur.execute(
        """
        INSERT INTO categories (name) VALUES (%s)
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
        """,
        (category_name,),
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


def _get_category_id(cur, category_name, valid_categories):
    """Get category ID if category exists in database"""
    if category_name not in valid_categories:
        return None

    cur.execute("SELECT id FROM categories WHERE name = %s LIMIT 1", (category_name,))
    row = cur.fetchone()
    if not row:
        return None

    return row[0]


def insert_to_db(db_url: str, companies: dict, update_mode: bool = False):
    """Insert or update crawled job data into the database.

    Args:
        db_url: PostgreSQL connection URL
        companies: Dictionary of company data with jobs
        update_mode: If True, update existing jobs with new data.
                     If False (default), skip existing jobs.

    Returns:
        dict: Statistics with 'inserted', 'updated', 'skipped' counts
    """
    stats = {"inserted": 0, "updated": 0, "skipped": 0}
    conn = None

    mode_str = "UPDATE" if update_mode else "SKIP"
    print(f"\n📦 Database mode: {mode_str} existing jobs")

    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()

        # Get all valid categories from database
        valid_categories = get_all_category(db_url)

        for name, cdata in companies.items():
            try:
                # Create a savepoint for this company
                cur.execute("SAVEPOINT company_savepoint")

                print(f"\n📁 Processing company: {name}")

                company_raw_id = _get_or_create_company_raw(cur, name, cdata)
                organization_id = _get_or_create_organization(cur, name, cdata)
                company_id = _insert_company(
                    cur, name, cdata, organization_id, company_raw_id
                )

                for title, jdata in cdata.get("jobs", {}).items():
                    job_raw_id = _get_or_create_job_raw(
                        cur, title, jdata, company_raw_id
                    )

                    # Get all province IDs for this job (many-to-many)
                    province_ids = []
                    if jdata.get("locations"):
                        for province_name in jdata.get("locations", []):
                            province_id = _find_province(cur, province_name)
                            if province_id:
                                province_ids.append(province_id)

                    # Link organization to each province
                    for p_id in province_ids:
                        _insert_organization_location(
                            cur, organization_id, p_id, cdata.get("address")
                        )

                    category_id = None
                    if jdata.get("category"):
                        category_id = _get_category_id(
                            cur, jdata["category"], valid_categories
                        )

                    # Insert or update job based on mode
                    job_id, action = _insert_job(
                        cur,
                        title,
                        jdata,
                        company_id,
                        job_raw_id,
                        category_id,
                        update_mode=update_mode,
                    )

                    # Track statistics
                    if action == "inserted":
                        stats["inserted"] += 1
                        # Link job to provinces via junction table (only for new jobs)
                        if province_ids:
                            _link_job_to_provinces(cur, job_id, province_ids)
                        # Link skills (only for new jobs, updates handle this internally)
                        for skill in jdata.get("skills", []):
                            skill_id = _get_or_create_skill(cur, skill)
                            _link_job_to_skill(cur, job_id, skill_id)
                    elif action == "updated":
                        stats["updated"] += 1
                    else:  # skipped
                        stats["skipped"] += 1

                # Release savepoint if successful
                cur.execute("RELEASE SAVEPOINT company_savepoint")

            except Exception as company_error:
                # Rollback to savepoint - only this company's changes
                cur.execute("ROLLBACK TO SAVEPOINT company_savepoint")
                cur.execute("RELEASE SAVEPOINT company_savepoint")
                print(f"⚠️  Error processing company '{name}': {company_error}")
                print("   Skipping company and continuing...")
                continue

        cur.close()
        conn.commit()

        total = stats["inserted"] + stats["updated"]
        print(f"\n✅ Import completed: {total} jobs processed")
        print(f"   ✓ Inserted: {stats['inserted']}")
        print(f"   ↻ Updated: {stats['updated']}")
        print(f"   ⊘ Skipped: {stats['skipped']}")

        return stats
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Database operation failed: {e}")
        return 0
    finally:
        if conn:
            conn.close()
