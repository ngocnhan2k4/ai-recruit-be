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

export interface UserTrends {
  date: string;
  count: number;
}

export interface UserTrendsQuery {
  fromDate?: string;
  toDate?: string;
}
