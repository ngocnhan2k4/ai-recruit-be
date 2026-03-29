from helpers.text import slugify
from rapidfuzz import process, fuzz

def get_or_create_skill(cur, skill_name):
    # Normalize name for checking
    normalized_name = skill_name.strip().lower()

    # EXACT MATCH Check: skills table (case-insensitive)
    cur.execute(
        "SELECT id FROM skills WHERE LOWER(name) = %s LIMIT 1", (normalized_name,)
    )
    row = cur.fetchone()
    if row:
        print(f"    [Skill] Exact match in 'skills': {skill_name}")
        return row[0]

    # EXACT MATCH Check: skills_synonyms table
    cur.execute(
        """
        SELECT master_name FROM skills_synonyms 
        WHERE LOWER(alias_name) = %s OR LOWER(master_name) = %s 
        LIMIT 1
        """,
        (normalized_name, normalized_name),
    )
    synonym_row = cur.fetchone()
    
    if synonym_row:
        master_name = synonym_row[0]
        print(f"    [Skill] Synonym match: {skill_name} -> {master_name}")
        # Check if master_name exists in skills table
        cur.execute(
            "SELECT id FROM skills WHERE LOWER(name) = LOWER(%s) LIMIT 1", (master_name,)
        )
        existing_master = cur.fetchone()
        if existing_master:
            return existing_master[0]
        else:
            # Insert master into skills table
            print(f"    [Skill] Creating master skill in DB: {master_name}")
            slug = slugify(master_name)
            cur.execute(
                "INSERT INTO skills (name, slug) VALUES (%s, %s) RETURNING id", 
                (master_name, slug)
            )
            return cur.fetchone()[0]

    # FUZZY MATCH Check (if no exact match)
    cur.execute("SELECT name FROM skills")
    all_skills = [r[0] for r in cur.fetchall()]
    
    cur.execute("SELECT alias_name, master_name FROM skills_synonyms")
    all_synonyms = cur.fetchall()
    synonym_map = {row[0].lower(): row[1] for row in all_synonyms}
    synonym_map.update({row[1].lower(): row[1] for row in all_synonyms})

    from rapidfuzz import process, fuzz
    best_skill_match = process.extractOne(skill_name, all_skills, scorer=fuzz.ratio)
    synonym_keys = list(synonym_map.keys())
    best_syn_match = process.extractOne(normalized_name, synonym_keys, scorer=fuzz.ratio)

    skill_score = best_skill_match[1] if best_skill_match else 0
    syn_score = best_syn_match[1] if best_syn_match else 0

    if max(skill_score, syn_score) >= 90:
        if skill_score >= syn_score:
            matched_name = best_skill_match[0]
            print(f"    [Skill] Fuzzy match (High - {skill_score}%): {skill_name} ~> {matched_name}")
            cur.execute("SELECT id FROM skills WHERE name = %s LIMIT 1", (matched_name,))
            return cur.fetchone()[0]
        else:
            matched_alias = best_syn_match[0]
            master_name = synonym_map[matched_alias]
            print(f"    [Skill] Fuzzy synonym (High - {syn_score}%): {skill_name} ~> {matched_alias} (Master: {master_name})")
            
            # Insert new mapping to skills_synonyms for future speed
            cur.execute(
                """
                INSERT INTO skills_synonyms (alias_name, master_name, source) 
                VALUES (%s, %s, 'crawler_fuzzy')
                ON CONFLICT (alias_name, source) DO NOTHING
                """,
                (normalized_name, master_name)
            )
            
            # Check/Insert into skills table
            cur.execute("SELECT id FROM skills WHERE LOWER(name) = LOWER(%s) LIMIT 1", (master_name,))
            master_row = cur.fetchone()
            if master_row:
                return master_row[0]
            else:
                slug = slugify(master_name)
                cur.execute("INSERT INTO skills (name, slug) VALUES (%s, %s) RETURNING id", (master_name, slug))
                return cur.fetchone()[0]

    if max(skill_score, syn_score) < 60:
        print(f"    [Skill] New skill detected (Low match): {skill_name}")
        slug = slugify(skill_name)
        cur.execute(
            "INSERT INTO skills (name, slug) VALUES (%s, %s) RETURNING id", 
            (skill_name, slug)
        )
        return cur.fetchone()[0]

    # Fallback (60-94 score)
    print(f"    [Skill] Defaulting to new (Match score {max(skill_score, syn_score)}%): {skill_name}")
    slug = slugify(skill_name)
    cur.execute("INSERT INTO skills (name, slug) VALUES (%s, %s) RETURNING id", (skill_name, slug))
    return cur.fetchone()[0]

def link_job_to_skill(cur, job_id, skill_id):
    cur.execute(
        "SELECT 1 FROM job_skills WHERE job_id = %s AND skill_id = %s",
        (job_id, skill_id),
    )
    if not cur.fetchone():
        cur.execute(
            "INSERT INTO job_skills (job_id, skill_id) VALUES (%s, %s)",
            (job_id, skill_id),
        )
