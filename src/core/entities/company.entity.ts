export class Company {
  id: bigint;
  name: string;
  logo_url: string | null;
  description: string | null;
  address: string[] | null;
  employees: string;
  website_url: string | null;

  constructor({
    id,
    name,
    logo_url,
    description,
    address,
    employees,
    website_url,
  }: {
    id: bigint;
    name: string;
    logo_url?: string | null;
    description?: string | null;
    address?: string[] | null;
    employees: string;
    website_url?: string | null;
  }) {
    this.id = id;
    this.name = name;
    this.logo_url = logo_url ?? null;
    this.description = description ?? null;
    this.address = address ?? null;
    this.employees = employees;
    this.website_url = website_url ?? null;
  }
}
