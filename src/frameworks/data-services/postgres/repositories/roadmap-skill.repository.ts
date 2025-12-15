import { IRoadmapSkillRepository, RoadmapSkill } from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { roadmapSkills, roadmapPhases, roadmapSkillOptions } from "../models";
import { eq, and, isNull } from "drizzle-orm";

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

    const unlockedSkills: RoadmapSkill[] = [];

    for (const skill of allSkills) {
      // Check if this skill has any completed option
      const completedOptions = await this.db
        .select()
        .from(roadmapSkillOptions)
        .where(
          and(
            eq(roadmapSkillOptions.roadmapSkillId, skill.id),
            isNull(roadmapSkillOptions.deletedAt),
          ),
        );

      const isSkillCompleted = completedOptions.some(
        (opt) => opt.completedAt !== null,
      );

      if (isSkillCompleted) continue; // Skip already completed

      const prerequisites = skill.prerequisites;
      if (!prerequisites || prerequisites.length === 0) {
        unlockedSkills.push(skill);
        continue;
      }

      // Check if all prerequisite skills are completed (each prerequisite skill has at least one completed option)
      const prerequisiteSkillsCompleted = await Promise.all(
        prerequisites.map(async (prereqSkillId) => {
          const options = await this.db
            .select()
            .from(roadmapSkillOptions)
            .where(
              and(
                eq(roadmapSkillOptions.roadmapSkillId, prereqSkillId),
                isNull(roadmapSkillOptions.deletedAt),
              ),
            );
          return options.some((opt) => opt.completedAt !== null);
        }),
      );

      if (prerequisiteSkillsCompleted.every((completed) => completed)) {
        unlockedSkills.push(skill);
      }
    }

    return unlockedSkills;
  }

  async checkPrerequisitesCompleted(skillId: string): Promise<boolean> {
    const skill = await this.db
      .select()
      .from(roadmapSkills)
      .where(eq(roadmapSkills.id, skillId))
      .limit(1);

    if (!skill || skill.length === 0) return false;

    const prerequisites = skill[0].prerequisites;
    if (!prerequisites || prerequisites.length === 0) return true;

    const prerequisiteChecks = await Promise.all(
      prerequisites.map(async (prereqSkillId) => {
        const options = await this.db
          .select()
          .from(roadmapSkillOptions)
          .where(
            and(
              eq(roadmapSkillOptions.roadmapSkillId, prereqSkillId),
              isNull(roadmapSkillOptions.deletedAt),
            ),
          );
        return options.some((opt) => opt.completedAt !== null);
      }),
    );

    return prerequisiteChecks.every((completed) => completed);
  }
}
