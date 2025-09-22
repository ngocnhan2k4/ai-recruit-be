export class Job {
  id: number;
  title: string;
  description: string;
  company_id: string;

  constructor({
    title,
    description,
    company,
  }: {
    email: string;
    name: string;
    age: number;
  }) {
    this.email = email;
    this.name = name;
    this.age = age;
  }
}
