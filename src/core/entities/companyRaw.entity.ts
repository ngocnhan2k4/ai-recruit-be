export class CompanyRaw {
  id: bigint;
  name: string;
  logoUrl: string | null;
  description: string | null;
  address: string[] | null;
  employees: string;
  websiteUrl: string | null;
  source: string;
  crawledAt: Date;
}
