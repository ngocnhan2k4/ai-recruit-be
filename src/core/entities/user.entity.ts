import { GenderEnum, RoleEnum } from "../../common/constants/roles";

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
  gender?: GenderEnum;
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
    gender,
  }: {
    username: string;
    email?: string;
    phone?: string;
    firebaseUid?: string;
    avatarUrl?: string;
    name: string;
    dob?: Date;
    roles: RoleEnum[];
    gender?: GenderEnum;
  }) {
    this.username = username;
    this.email = email;
    this.phone = phone;
    this.firebaseUid = firebaseUid;
    this.avatarUrl = avatarUrl;
    this.name = name;
    this.dob = dob;
    this.roles = roles;
    this.gender = gender;
  }
}

export class UserExperience {
  id: number;
  userId: number;
  companyId: string;
  position: string;
  jobTitle: string;
  startDate: Date;
  endDate?: Date;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class UserSkill {
  userId: number;
  skillId: string;
}
