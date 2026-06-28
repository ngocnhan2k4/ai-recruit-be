import { GeneralQuery } from "@/common/types";
import { Skill } from ".";

export interface SkillFilter extends GeneralQuery {
  fields?: string[];
  questions?: boolean; // Get skill if it exist question
  skillIds?: string[];
  isApproved?: boolean;
  exactNames?: string[];
  skipCount?: boolean;
  hasSynonyms?: boolean;
}

export type GetListSkillResponse = Pick<Skill, "name" | "id"> & {
  createdAt?: Skill["createdAt"];
  questionCount?: number;
};

export enum SkillReviewStatus {
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export interface SkillSynonymResponse {
  id: string;
  masterName: string;
  aliasNames: string[];
}
