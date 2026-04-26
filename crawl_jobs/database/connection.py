import psycopg2
from database.repositories import company, job, province, skill
from job_index_queue import JobIndexQueueProducer


def insert_to_db(
    db_url: str,
    companies: dict,
    update_mode: bool = False,
    index_queue_producer: JobIndexQueueProducer | None = None,
):
    stats = {
        "inserted": 0,
        "updated": 0,
        "skipped": 0,
        "queue_enqueued": 0,
        "queue_failed": 0,
    }
    upsert_job_ids: list[str] = []
    conn = None
    mode_label = "UPDATE" if update_mode else "SKIP"
    print(f"\n Database mode: {mode_label} existing jobs")

    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()

        # Pre-fetch categories for quick lookup
        valid_categories = job.get_all_categories(cur)

        for name, cdata in companies.items():
            company_upsert_job_ids: list[str] = []
            try:
                cur.execute("SAVEPOINT company_savepoint")
                print(f"\n Processing company: {name}")

                # 1. Company and Organization
                company_raw_id = company.get_or_create_company_raw(cur, name, cdata)
                organization_id = company.get_or_create_organization(cur, name, cdata)
                company.insert_company(
                    cur, name, cdata, organization_id, company_raw_id
                )

                for title, jdata in cdata.get("jobs", {}).items():
                    # 2. Job Raw record
                    job_raw_id = job.get_or_create_job_raw(
                        cur, title, jdata, company_raw_id
                    )

                    # 3. Province normalization and Job-Province mapping
                    province_ids = []
                    if jdata.get("locations"):
                        for p_name in jdata["locations"]:
                            p_id = province.find_province(cur, p_name)
                            if p_id:
                                province_ids.append(p_id)
                                # Link organization to locations
                                company.insert_organization_location(
                                    cur, organization_id, p_id, cdata.get("address")
                                )

                    # 4. Check for existing job
                    job_url = jdata.get("job_url")
                    existing_id, _ = job.find_existing_job(
                        cur, title, organization_id, job_url
                    )

                    category_id = valid_categories.get(jdata.get("category"))

                    if existing_id:
                        if update_mode:
                            job.update_job(cur, existing_id, jdata, category_id)
                            # Update mappings
                            cur.execute(
                                "DELETE FROM job_provinces WHERE job_id = %s",
                                (existing_id,),
                            )
                            province.link_job_to_provinces(
                                cur, existing_id, province_ids
                            )

                            cur.execute(
                                "DELETE FROM job_skills WHERE job_id = %s",
                                (existing_id,),
                            )
                            for s_name in jdata.get("skills", []):
                                s_id = skill.get_or_create_skill(cur, s_name)
                                skill.link_job_to_skill(cur, existing_id, s_id)

                            company_upsert_job_ids.append(existing_id)

                            print(f'   Updated "{title}"')
                            stats["updated"] += 1
                        else:
                            print(f'   Skipped "{title}"')
                            stats["skipped"] += 1
                    else:
                        # 5. Insert new Job
                        job_id = job.insert_job(
                            cur, title, jdata, organization_id, job_raw_id, category_id
                        )
                        province.link_job_to_provinces(cur, job_id, province_ids)
                        for s_name in jdata.get("skills", []):
                            s_id = skill.get_or_create_skill(cur, s_name)
                            skill.link_job_to_skill(cur, job_id, s_id)

                        company_upsert_job_ids.append(job_id)

                        print(f'   Inserted "{title}"')
                        stats["inserted"] += 1

                cur.execute("RELEASE SAVEPOINT company_savepoint")
                upsert_job_ids.extend(company_upsert_job_ids)
            except Exception as e:
                cur.execute("ROLLBACK TO SAVEPOINT company_savepoint")
                print(f' Error processing company "{name}": {e}')

        conn.commit()

        if index_queue_producer and upsert_job_ids:
            try:
                stats["queue_enqueued"] = index_queue_producer.enqueue_upsert_jobs(
                    upsert_job_ids
                )
            except Exception as queue_error:
                stats["queue_failed"] = len(set(upsert_job_ids))
                print(f" Queue enqueue failed: {queue_error}")

        return stats
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Database operation failed: {e}")
        return stats
    finally:
        if conn:
            conn.close()
