import { RoadmapSkill } from "@/core";
import { IGenericRepository } from "./generic-repository.abstract";
import { DBDrizzleTransaction } from "@/frameworks/data-services/postgres/types";

export abstract class IRoadmapSkillRepository extends IGenericRepository<RoadmapSkill> {
  abstract getSkillsByPhaseId(phaseId: string): Promise<RoadmapSkill[]>;

  abstract getSkillsByRoadmapId(roadmapId: string): Promise<RoadmapSkill[]>;

  abstract createSkills(
    skills: Partial<RoadmapSkill>[],
  ): Promise<RoadmapSkill[]>;

  abstract markSkillCompleted(
    skillId: string,
    tx?: DBDrizzleTransaction,
  ): Promise<RoadmapSkill>;

  abstract getUnlockedSkills(roadmapId: string): Promise<RoadmapSkill[]>;

  abstract checkPrerequisitesCompleted(skillId: string): Promise<boolean>;

  abstract createManySkills(
    skills: Partial<RoadmapSkill>[],
    tx?: DBDrizzleTransaction,
  ): Promise<RoadmapSkill[]>;
}
