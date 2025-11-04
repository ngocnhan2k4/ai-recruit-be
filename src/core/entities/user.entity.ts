import { GeneralQuery } from "@/common/types/api";
import { Job, OrganizationWithDetails, Skill } from ".";

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
