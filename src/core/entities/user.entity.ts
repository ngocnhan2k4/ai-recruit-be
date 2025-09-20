import  { RoleEnum } from "../enums/roles"

export class User {
  id: number;
  email: string;
  name: string;
  age: number;
  firebaseUid: string;
  roles: RoleEnum[];
  createdAt: Date;
  updatedAt: Date;
  avatar?: string;
  constructor({
    email,
    name,
    age,
    firebaseUid,
    roles,
    createdAt,
    updatedAt,
    avatar
  }: {
    email: string;
    name: string;
    age: number;
    firebaseUid: string;
    roles: RoleEnum[];
    createdAt: Date;
    updatedAt: Date;
    avatar?: string;
  }) {
    this.email = email;
    this.name = name;
    this.age = age;
    this.firebaseUid = firebaseUid;
    this.roles = roles;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.avatar = avatar;
  }
}
