export class Company {
  id: string;
  name: string;
  logoUrl: string | null;
  description: string | null;
  address: string[] | null;
  employeesMin: number;
  employeesMax: number;
  websiteUrl: string | null;
}
