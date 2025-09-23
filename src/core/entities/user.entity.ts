import { RoleEnum } from "../enums/roles";

export class User {
  id: number;
  username: string;
  email?: string;
  phone?: string;
  firebaseUid?: string;
  avatarUrl?: string;
  name: string;
  dob?: Date;
  createdAt: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  roles: RoleEnum[];

  constructor({
    username,
    email,
    phone,
    firebaseUid,
    avatarUrl,
    name,
    dob,
    roles,
  }: {
    username: string;
    email?: string;
    phone?: string;
    firebaseUid?: string;
    avatarUrl?: string;
    name: string;
    dob?: Date;
    roles: RoleEnum[];
  }) {
    this.username = username;
    this.email = email;
    this.phone = phone;
    this.firebaseUid = firebaseUid;
    this.avatarUrl = avatarUrl;
    this.name = name;
    this.dob = dob;
    this.roles = roles;
  }
}
