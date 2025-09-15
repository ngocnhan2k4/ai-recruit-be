export class User {
  id: number;
  email: string;
  name: string;
  age: number;
  constructor({
    email,
    name,
    age,
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
