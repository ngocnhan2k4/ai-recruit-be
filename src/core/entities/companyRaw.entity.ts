export class CompanyRaw {
  id: bigint;
  name: string;
  logo_url: string | null;
  description: string | null;
  address: string[] | null;
  employees: string;
  website_url: string | null;
  source: string;
  crawled_at: Date;

  constructor({
    id,
    name,
    logo_url,
    description,
    address,
    employees,
    website_url,
    source,
    crawled_at,
  }: {
    id: bigint;
    name: string;
    logo_url?: string | null;
    description?: string | null;
    address?: string[] | null;
    employees: string;
    website_url?: string | null;
    source: string;
    crawled_at: Date;
  }) {
    this.id = id;
    this.name = name;
    this.logo_url = logo_url ?? null;
    this.description = description ?? null;
    this.address = address ?? null;
    this.employees = employees;
    this.website_url = website_url ?? null;
    this.source = source;
    this.crawled_at = crawled_at;
  }
}
