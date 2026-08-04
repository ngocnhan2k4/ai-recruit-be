import { GeneralQuery } from "@/common/types";
import { Skill } from ".";

export interface SkillFilter extends GeneralQuery {
  fields?: string[];
  questions?: boolean; // Get skill if it exist question
  minQuestionCount?: number;
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

/** User skill profile row enriched for API responses. */
export type UserSkillResponse = {
  id: string;
  name: string;
  source: string | null;
  /** From latest qualifying user_tests.skill_levels_assessed when source is exam. */
  level: string | null;
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
