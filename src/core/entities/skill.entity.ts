import { GeneralQuery } from "@/common/types";
import { Skill } from ".";

export interface SkillFilter extends GeneralQuery {
  fields?: string[];
  questions?: boolean; // Get skill if it exist question
  skillIds?: string[];
}

export type GetListSkillResponse = Pick<Skill, "name" | "id"> & {
  questionCount?: number;
};

export type CrawledSkillResponse = Pick<Skill, "id" | "name" | "createdAt"> & {
  synonym: null;
};

export enum SkillReviewStatus {
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}
