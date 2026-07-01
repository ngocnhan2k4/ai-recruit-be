import { IRoadmapSkillRepository, RoadmapSkill } from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { roadmapSkills, roadmapPhases, roadmapSkillOptions } from "../models";
import { eq, and, isNull, inArray } from "drizzle-orm";

@Injectable()
export class RoadmapSkillRepository
  extends GenericRepository<RoadmapSkill, typeof roadmapSkills>
  implements IRoadmapSkillRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, roadmapSkills);
  }

  async getSkillsByPhaseId(phaseId: string): Promise<RoadmapSkill[]> {
    return await this.db
      .select()
      .from(roadmapSkills)
      .where(
        and(
          eq(roadmapSkills.phaseId, phaseId),
          isNull(roadmapSkills.deletedAt),
        ),
      )
      .orderBy(roadmapSkills.orderIndex);
  }

  async getSkillsByRoadmapId(roadmapId: string): Promise<RoadmapSkill[]> {
    return await this.db
      .select()
      .from(roadmapSkills)
      .innerJoin(roadmapPhases, eq(roadmapSkills.phaseId, roadmapPhases.id))
      .where(
        and(
          eq(roadmapPhases.roadmapId, roadmapId),
          isNull(roadmapSkills.deletedAt),
        ),
      )
      .orderBy(roadmapPhases.orderIndex, roadmapSkills.orderIndex)
      .then((rows) => rows.map((row) => row.roadmap_skills));
  }

  async getUnlockedSkills(roadmapId: string): Promise<RoadmapSkill[]> {
    const allSkills = await this.getSkillsByRoadmapId(roadmapId);
    if (allSkills.length === 0) return [];

    const allSkillIds = allSkills.map((s) => s.id);

    // Batch fetch all options for all skills in one query
    const allOptions = await this.db
      .select({
        roadmapSkillId: roadmapSkillOptions.roadmapSkillId,
        completedAt: roadmapSkillOptions.completedAt,
      })
      .from(roadmapSkillOptions)
      .where(
        and(
          inArray(roadmapSkillOptions.roadmapSkillId, allSkillIds),
          isNull(roadmapSkillOptions.deletedAt),
        ),
      );

    // Build set of skill IDs that have at least one completed option
    const completedSkillIds = new Set(
      allOptions
        .filter((o) => o.completedAt !== null)
        .map((o) => o.roadmapSkillId),
    );

    return allSkills.filter((skill) => {
      if (completedSkillIds.has(skill.id)) return false; // already done

      const prereqs = skill.prerequisites as string[] | null;
      if (!prereqs || prereqs.length === 0) return true;

      return prereqs.every((prereqId) => completedSkillIds.has(prereqId));
    });
  }

  async moveToPhase(skillId: string, targetPhaseId: string): Promise<void> {
    await this.db
      .update(roadmapSkills)
      .set({ phaseId: targetPhaseId })
      .where(eq(roadmapSkills.id, skillId));
  }

  async checkPrerequisitesCompleted(skillId: string): Promise<boolean> {
    const [skill] = await this.db
      .select({ prerequisites: roadmapSkills.prerequisites })
      .from(roadmapSkills)
      .where(eq(roadmapSkills.id, skillId))
      .limit(1);

    if (!skill) return false;

    const prerequisites = skill.prerequisites as string[] | null;
    if (!prerequisites || prerequisites.length === 0) return true;

    // Batch fetch options for all prerequisite skills, check which have completedAt
    const prereqOptions = await this.db
      .select({
        roadmapSkillId: roadmapSkillOptions.roadmapSkillId,
        completedAt: roadmapSkillOptions.completedAt,
      })
      .from(roadmapSkillOptions)
      .where(
        and(
          inArray(roadmapSkillOptions.roadmapSkillId, prerequisites),
          isNull(roadmapSkillOptions.deletedAt),
        ),
      );

    const metPrereqIds = new Set(
      prereqOptions
        .filter((o) => o.completedAt !== null)
        .map((o) => o.roadmapSkillId),
    );

    return prerequisites.every((prereqId) => metPrereqIds.has(prereqId));
  }
}
