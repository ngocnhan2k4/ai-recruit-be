import { GeneralQuery } from "@/common/types";
import {
  Category,
  Job,
  OrganizationWithDetails,
  Province,
  Skill,
  Subscription,
  User,
  UserSubscription,
  UserSubscriptionStatusEnum,
} from ".";
import { RoleEnum } from "@/common/constants";

export interface GetUserQuery extends GeneralQuery {
  isActive?: boolean;
  isDeleted?: boolean;
  subscriptionId?: string;
  statusSubscription?: UserSubscriptionStatusEnum;
  roles?: RoleEnum[];
}

export class CreateUserExperience {
  organizationId?: OrganizationWithDetails["id"];
  organizationName?: OrganizationWithDetails["name"];
  jobTitle: Job["title"];
  position: string;
  startDate: Date;
  endDate?: Date;
  description: string;
  languageCode?: string;
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
  isSeekingJob?: boolean;
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

export interface GetAllUserResponse
  extends Pick<
    User,
    | "id"
    | "email"
    | "name"
    | "username"
    | "emailVerified"
    | "phone"
    | "phoneVerified"
    | "roles"
    | "status"
    | "deletionRequestedAt"
    | "purgeAfterAt"
    | "createdAt"
    | "updatedAt"
    | "deletedAt"
  > {
  subscription?: Pick<
    Subscription,
    "id" | "name" | "price" | "billingCycle" | "isActive"
  >;
  userSubscription?: Pick<
    UserSubscription,
    "id" | "startedAt" | "expiredAt" | "status" | "createdAt"
  >;
}
