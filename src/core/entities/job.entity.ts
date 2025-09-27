export class Job {
  id: string;
  title: string;
  description: Record<string, unknown> | null;
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
    description: Record<string, unknown> | null;
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

export interface StatisticsJobFilter {
  fromDate?: Date;
  toDate?: Date;
  categoryId?: string;
  provinceId?: string;
  isOpen?: boolean;
}
