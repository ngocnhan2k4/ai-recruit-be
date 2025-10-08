import psycopg2
from psycopg2.extras import Json

def insert_to_db(db_url: str, companies: dict):
    job_inserted = 0

    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()

        for name, cdata in companies.items():
            print(f"Insert jobs of {name}")
            addresses = cdata.get("address") or []
            province_id = None

            # --- Check if company exists ---
            cur.execute("SELECT id FROM companies WHERE name = %s LIMIT 1", (name,))
            row = cur.fetchone()

            if row:
                company_id = row[0]
            else:
                cur.execute(
                    """
                    INSERT INTO companies
                        (name, logo_url, description, address, website_url, employees_min, employees_max, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (
                        name,
                        cdata.get("logo"),
                        cdata.get("description"),
                        addresses,
                        cdata.get("website_url"),
                        cdata.get("employees_min"),
                        cdata.get("employees_max"),
                        cdata.get("crawled_at")
                    ),
                )
                inserted = cur.fetchone()
                if not inserted:
                    raise RuntimeError(f"No id returned for company {name}")
                company_id = inserted[0]

            # --- Insert each job ---
            for title, jdata in cdata.get("jobs", {}).items():

                # --- Check if province exists ---
                for province in jdata.get("locations", []):
                    cur.execute("SELECT id FROM provinces WHERE name ILIKE %s LIMIT 1", (f"%{province}%",))
                    prov_col = cur.fetchone()
                    if prov_col:
                        province_id = prov_col[0]
                    elif province is not None:
                        cur.execute(
                            "INSERT INTO provinces (name) VALUES (%s) RETURNING id",
                            (province,)
                        )
                        province_id = cur.fetchone()[0]

                cur.execute("SELECT 1 FROM jobs WHERE title = %s AND company_id = %s", (title, company_id))
                if cur.fetchone():
                    print(f"Job '{title}' already exists for company '{name}', skipping.")
                    continue

                cur.execute(
                    """
                    INSERT INTO jobs
                        (title, description, date_posted, company_id, province_id, created_at, salary_min, salary_max, experience_min, experience_max, end_date)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
                    """,
                    (
                        title,
                        Json(jdata.get("description")),
                        jdata.get("date_posted"),
                        company_id,
                        province_id,
                        jdata.get("crawled_at"),
                        jdata.get("salary_min"),
                        jdata.get("salary_max"),
                        jdata.get("experience_min"),
                        jdata.get("experience_max"),
                        jdata.get("end_date"),
                    ),
                )

                job_inserted += 1

                job_id = cur.fetchone()[0]

                # Check if skills exist in skills table
                for skill in jdata.get("skills", []):
                    # Try to find existing skill
                    cur.execute(
                        "SELECT id FROM skills WHERE LOWER(name) = LOWER(%s) LIMIT 1",
                        (skill,),
                    )
                    result = cur.fetchone()
                    if result:
                        skill_id = result[0]
                    else:
                        # Insert new skill and get id
                        cur.execute(
                            "INSERT INTO skills (name) VALUES (%s) RETURNING id",
                            (skill,),
                        )
                        skill_id = cur.fetchone()[0]

                    # check existence before inserting into job_skills
                    cur.execute(
                        "SELECT 1 FROM job_skills WHERE job_id = %s AND skill_id = %s",
                        (job_id, skill_id)
                    )
                    if not cur.fetchone():
                        cur.execute(
                            "INSERT INTO job_skills (job_id, skill_id) VALUES (%s, %s)",
                            (job_id, skill_id)
                        )

        conn.commit()
        cur.close()
        conn.close()
        print("Import completed.")

        return job_inserted
    except Exception as e:
        print("Database connection failed:", e)