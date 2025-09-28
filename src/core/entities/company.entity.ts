export class Company {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  address: string[] | null;
  employees_min: number;
  employees_max: number;
  website_url: string | null;

  constructor({
    id,
    name,
    logo_url,
    description,
    address,
    website_url,
    employees_min,
    employees_max,
  }: {
    id: string;
    name: string;
    logo_url?: string | null;
    description?: string | null;
    address?: string[] | null;
    employees_min: number;
    employees_max: number;
    website_url?: string | null;
  }) {
    this.id = id;
    this.name = name;
    this.logo_url = logo_url ?? null;
    this.description = description ?? null;
    this.address = address ?? null;
    this.website_url = website_url ?? null;
    this.employees_min = employees_min;
    this.employees_max = employees_max;
  }
}
