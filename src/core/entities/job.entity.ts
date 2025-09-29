export class Job {
  id: string;
  title: string;
  description: Record<string, unknown> | null;
  companyId: string;
  salaryMin: number | null;
  salaryMax: number | null;
  createdAt: Date;
  updatedAt: Date | null;
  deletedAt: Date | null;
}

export interface StatisticsJobFilter {
  fromDate?: Date;
  toDate?: Date;
  categoryId?: string;
  provinceId?: string;
  isOpen?: boolean;
}
