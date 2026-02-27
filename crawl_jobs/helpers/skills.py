COMMON_TECH_SKILLS = [
    "Python", "JavaScript", "Java", "C++", "C#", "TypeScript", "Go", "Rust",
    "React", "Angular", "Vue", "Node.js", "Django", "Flask", "Spring",
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Git", "CI/CD",
    "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch",
    ".NET", "PHP", "Ruby", "Swift", "Kotlin", "Scala",
    "Linux", "DevOps", "Agile", "Scrum",
    "HTML", "CSS", "REST", "GraphQL", "API", "Microservices",
    "Machine Learning", "AI", "TensorFlow", "PyTorch",
    "Kafka", "RabbitMQ", "Jenkins", "Terraform",
    "R", "MATLAB",
]


def extract_skills_from_text(text: str, existing_skills: list = None) -> list:
    """
    Extract common tech skills mentioned in a text string.

    Args:
        text: Text to search for skills (e.g. job description)
        existing_skills: Already found skills to avoid duplicates

    Returns:
        List of skills found in the text
    """
    if not text:
        return existing_skills or []

    skills = list(existing_skills) if existing_skills else []
    text_lower = text.lower()

    for skill in COMMON_TECH_SKILLS:
        if skill.lower() in text_lower and skill not in skills:
            skills.append(skill)

    return skills
