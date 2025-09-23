export class JobRaw {
  id: number;
  title: string;
  description: string | null;
  url: string | null;
  date_posted: Date | null;
  skills: string[];
  crawled_at: Date;
  company_id: number;
  salary_range: JSON | null;
  source: string;

  constructor({
    id,
    title,
    description,
    url,
    date_posted,
    skills,
    crawled_at,
    company_id,
    salary_range,
    source,
  }: {
    id: number;
    title: string;
    description?: string | null;
    url?: string | null;
    date_posted?: Date | null;
    skills: string[];
    crawled_at: Date;
    company_id: number;
    salary_range?: JSON | null;
    source: string;
  }) {
    this.id = id;
    this.title = title;
    this.description = description ?? null;
    this.url = url ?? null;
    this.date_posted = date_posted ?? null;
    this.skills = skills;
    this.crawled_at = crawled_at;
    this.company_id = company_id;
    this.salary_range = salary_range ?? null;
    this.source = source;
  }
}
