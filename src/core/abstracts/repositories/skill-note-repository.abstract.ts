import { SkillNote } from "@/core";
import { IGenericRepository } from "./generic-repository.abstract";

export abstract class ISkillNoteRepository extends IGenericRepository<SkillNote> {
  abstract getBySkillAndUser(
    roadmapSkillId: string,
    userId: string,
  ): Promise<SkillNote | null>;

  abstract upsert(
    roadmapSkillId: string,
    userId: string,
    content: string,
  ): Promise<SkillNote>;

  abstract getAllByRoadmapAndUser(
    roadmapId: string,
    userId: string,
  ): Promise<Array<SkillNote & { skillName: string; phaseName: string }>>;
}
