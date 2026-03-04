import { RoadmapSkill } from "@/core";
import { IGenericRepository } from "./generic-repository.abstract";

export abstract class IRoadmapSkillRepository extends IGenericRepository<RoadmapSkill> {
  abstract getSkillsByPhaseId(phaseId: string): Promise<RoadmapSkill[]>;

  abstract getSkillsByRoadmapId(roadmapId: string): Promise<RoadmapSkill[]>;

  abstract getUnlockedSkills(roadmapId: string): Promise<RoadmapSkill[]>;

  abstract checkPrerequisitesCompleted(skillId: string): Promise<boolean>;
}
