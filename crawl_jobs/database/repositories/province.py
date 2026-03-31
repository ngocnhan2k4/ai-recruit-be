from helpers.province import get_standard_province_name

def find_province(cur, province_name):
    if not province_name:
        return get_fallback_province(cur)
    standard_name = get_standard_province_name(province_name)
    cur.execute("SELECT id FROM provinces WHERE name ILIKE %s LIMIT 1", (standard_name,))
    row = cur.fetchone()
    if row: return row[0]
    cur.execute("SELECT id FROM provinces WHERE name ILIKE %s LIMIT 1", (f"%{standard_name}%",))
    row = cur.fetchone()
    if row: return row[0]
    return get_fallback_province(cur)

def get_fallback_province(cur):
    cur.execute("SELECT id FROM provinces WHERE name = 'Khác' LIMIT 1")
    row = cur.fetchone()
    return row[0] if row else None

def link_job_to_provinces(cur, job_id, province_ids):
    if not province_ids or not job_id: return
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
