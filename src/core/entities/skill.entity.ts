import { GeneralQuery } from "@/common/types";
import { Skill } from ".";

export interface SkillFilter extends GeneralQuery {
  fields?: string[];
  questions?: boolean; // Get skill if it exist question
  skillIds?: string[];
  isApproved?: boolean;
}

export type GetListSkillResponse = Pick<Skill, "name" | "id"> & {
  createdAt?: Skill["createdAt"];
  questionCount?: number;
};

export enum SkillReviewStatus {
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}
