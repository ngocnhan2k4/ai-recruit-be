export class JobRaw {
  id: number;
  title: string;
  description: string | null;
  url: string | null;
  datePosted: Date | null;
  skills: string[];
  crawledAt: Date;
  companyId: number;
  salaryRange: JSON | null;
  source: string;
}
