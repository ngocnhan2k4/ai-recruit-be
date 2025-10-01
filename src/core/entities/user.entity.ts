import { GenderEnum, RoleEnum } from "../../common/constants/roles";

export class User {
  id: number;
  username: string;
  email: string | null;
  phone: string | null;
  firebaseUid: string | null;
  avatarUrl: string | null;
  name: string;
  dob: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
  deletedAt: Date | null;
  gender: GenderEnum | null;
  roles: RoleEnum[];
  emailVerified: boolean;

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
    emailVerified,
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
    emailVerified?: boolean;
  }) {
    this.username = username;
    this.email = email ?? null;
    this.phone = phone ?? null;
    this.firebaseUid = firebaseUid ?? null;
    this.avatarUrl = avatarUrl ?? null;
    this.name = name;
    this.dob = dob ?? null;
    this.roles = roles;
    this.gender = gender ?? null;
    this.emailVerified = !!emailVerified;
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
