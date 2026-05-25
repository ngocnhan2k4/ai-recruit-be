from helpers.text import slugify
from rapidfuzz import fuzz, process


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

    # EXACT MATCH Check: skills_synonyms table (using master_skill_id now)
    cur.execute(
        """
        SELECT master_skill_id FROM skills_synonyms 
        WHERE LOWER(alias_name) = %s 
        LIMIT 1
        """,
        (normalized_name,),
    )
    synonym_row = cur.fetchone()

    if synonym_row:
        master_id = synonym_row[0]
        print(
            f"    [Skill] Synonym match: {skill_name} -> mapped to master ID {master_id}"
        )
        return master_id

    # FUZZY MATCH Check (if no exact match)
    cur.execute("SELECT id, name FROM skills")
    all_skills_data = cur.fetchall()
    all_skills = [r[1] for r in all_skills_data]
    skill_name_to_id = {r[1]: r[0] for r in all_skills_data}

    cur.execute("SELECT alias_name, master_skill_id FROM skills_synonyms")
    all_synonyms = cur.fetchall()
    synonym_map = {row[0].lower(): row[1] for row in all_synonyms}

    best_skill_match = process.extractOne(skill_name, all_skills, scorer=fuzz.ratio)
    synonym_keys = list(synonym_map.keys())
    best_syn_match = process.extractOne(
        normalized_name, synonym_keys, scorer=fuzz.ratio
    )

    skill_score = best_skill_match[1] if best_skill_match else 0
    syn_score = best_syn_match[1] if best_syn_match else 0

    if max(skill_score, syn_score) >= 90:
        if skill_score >= syn_score:
            matched_name = best_skill_match[0]
            print(
                f"    [Skill] Fuzzy match (High - {skill_score}%): {skill_name} ~> {matched_name}"
            )
            return skill_name_to_id[matched_name]
        else:
            matched_alias = best_syn_match[0]
            master_id = synonym_map[matched_alias]
            print(
                f"    [Skill] Fuzzy synonym (High - {syn_score}%): {skill_name} ~> {matched_alias}"
            )

            # Insert new mapping to skills_synonyms for future speed
            cur.execute(
                """
                INSERT INTO skills_synonyms (alias_name, master_skill_id) 
                VALUES (%s, %s)
                ON CONFLICT (alias_name) DO NOTHING
                """,
                (normalized_name, master_id),
            )
            return master_id

    if max(skill_score, syn_score) < 60:
        print(f"    [Skill] New skill detected (Low match): {skill_name}")
        slug = slugify(skill_name)
        cur.execute(
            "INSERT INTO skills (name, slug) VALUES (%s, %s) RETURNING id",
            (skill_name, slug),
        )
        return cur.fetchone()[0]

    # Fallback (60-94 score)
    print(
        f"    [Skill] Defaulting to new (Match score {max(skill_score, syn_score)}%): {skill_name}"
    )
    slug = slugify(skill_name)
    cur.execute(
        "INSERT INTO skills (name, slug) VALUES (%s, %s) RETURNING id",
        (skill_name, slug),
    )
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
