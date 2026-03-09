import { GeneralQuery } from "@/common/types";
import {
  Category,
  Job,
  OrganizationWithDetails,
  Province,
  Skill,
  User,
} from ".";

export interface GetUserQuery extends GeneralQuery {
  isActive?: boolean;
  isDeleted?: boolean;
}

export class CreateUserExperience {
  organizationId?: OrganizationWithDetails["id"];
  organizationName?: OrganizationWithDetails["name"];
  jobTitle: Job["title"];
  position: string;
  startDate: Date;
  endDate?: Date;
  description: string;
  skillIds?: Skill["id"][];
  skillNames?: Skill["name"][];
}

export interface UserProfile {
  userId: User["id"];
  skillIds: Skill["id"][];
  experienceYears: number;
  provinceIds: Province["id"][];
  categoryIds: Category["id"][];
  expectedSalary?: number;
}

export interface UserCvExperience {
  position: string;
  jobTitle: string;
  organizationName: string;
  startDate: string;
  endDate: string | null;
  description: string | null;
}

export interface UserCvEducation {
  degree: string | null;
  major: string | null;
  schoolName: string;
  startDate: string | null;
  endDate: string | null;
}

export interface UserCvData {
  userId: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  bio: string | null;
  skills: string[];
  experiences: UserCvExperience[];
  educations: UserCvEducation[];
}

export interface UserTrends {
  date: string;
  count: number;
}

export interface UserTrendsQuery {
  fromDate?: string;
  toDate?: string;
}
