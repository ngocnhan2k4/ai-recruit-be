from helpers.text import slugify
from database.models.enums import OrganizationType

def get_or_create_company_raw(cur, name, cdata):
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

def get_or_create_organization(cur, name, cdata):
    slug = slugify(name)
    cur.execute("SELECT id FROM organizations WHERE name = %s LIMIT 1", (name,))
    row = cur.fetchone()
    if row:
        return row[0]

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
    return cur.fetchone()[0]

def insert_company(cur, name, cdata, organization_id, company_raw_id):
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
    return cur.fetchone()[0]

def insert_organization_location(cur, organization_id, province_id, locations):
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
