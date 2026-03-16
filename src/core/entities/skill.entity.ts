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
