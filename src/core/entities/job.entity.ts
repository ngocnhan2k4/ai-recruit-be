export class Job {
  id: number;
  title: string;
  description: JSON | null;
  company_id: string;
  salary_min: number | null;
  salary_max: number | null;
  created_at: Date;
  updated_at: Date | null;
  deleted_at: Date | null;

  constructor({
    title,
    description,
    company_id,
    salary_min,
    salary_max,
  }: {
    title: string;
    description: JSON;
    company_id: string;
    salary_min: number | null;
    salary_max: number | null;
  }) {
    this.title = title;
    this.description = description;
    this.company_id = company_id;
    this.salary_min = salary_min;
    this.salary_max = salary_max;
  }
}
