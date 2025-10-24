import { GeneralQuery } from "@/common/types/api";
import { Job, Organization, Skill } from ".";

export interface GetUserQuery extends GeneralQuery {
  isActive?: boolean;
  isDeleted?: boolean;
}

export class CreateUserExperience {
  organizationId?: Organization["id"];
  organizationName?: Organization["name"];
  jobTitle: Job["title"];
  position: string;
  startDate: Date;
  endDate?: Date;
  description: string;
  skillIds?: Skill["id"][];
  skillNames?: Skill["name"][];
}
