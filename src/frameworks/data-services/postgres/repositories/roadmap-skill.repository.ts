import { IRoadmapSkillRepository, RoadmapSkill } from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle, DBDrizzleTransaction } from "../types";
import { roadmapSkills, roadmapPhases } from "../models";
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
      .select({
        id: roadmapSkills.id,
        phaseId: roadmapSkills.phaseId,
        positionName: roadmapSkills.positionName,
        positionDescription: roadmapSkills.positionDescription,
        skillId: roadmapSkills.skillId,
        skillName: roadmapSkills.skillName,
        reason: roadmapSkills.reason,
        estimatedHours: roadmapSkills.estimatedHours,
        weekStart: roadmapSkills.weekStart,
        weekEnd: roadmapSkills.weekEnd,
        prerequisites: roadmapSkills.prerequisites,
        resources: roadmapSkills.resources,
        keyConcepts: roadmapSkills.keyConcepts,
        completedAt: roadmapSkills.completedAt,
        orderIndex: roadmapSkills.orderIndex,
        createdAt: roadmapSkills.createdAt,
        updatedAt: roadmapSkills.updatedAt,
        deletedAt: roadmapSkills.deletedAt,
      })
      .from(roadmapSkills)
      .innerJoin(roadmapPhases, eq(roadmapSkills.phaseId, roadmapPhases.id))
      .where(
        and(
          eq(roadmapPhases.roadmapId, roadmapId),
          isNull(roadmapSkills.deletedAt),
        ),
      )
      .orderBy(roadmapPhases.orderIndex, roadmapSkills.orderIndex);
  }

  async createSkills(skills: Partial<RoadmapSkill>[]): Promise<RoadmapSkill[]> {
    const dbInstance = this.db;

    const result = await dbInstance
      .insert(roadmapSkills)
      .values(skills as any)
      .returning();

    return result;
  }

  async markSkillCompleted(
    skillId: string,
    tx?: DBDrizzleTransaction,
  ): Promise<RoadmapSkill> {
    const dbInstance = tx ?? this.db;

    const result = await dbInstance
      .update(roadmapSkills)
      .set({
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(roadmapSkills.id, skillId))
      .returning();

    return result[0];
  }

  async getUnlockedSkills(roadmapId: string): Promise<RoadmapSkill[]> {
    const allSkills = await this.getSkillsByRoadmapId(roadmapId);

    const unlockedSkills: RoadmapSkill[] = [];

    for (const skill of allSkills) {
      if (skill.completedAt) continue; // Skip already completed

      const prerequisites = skill.prerequisites;
      if (!prerequisites || prerequisites.length === 0) {
        unlockedSkills.push(skill);
        continue;
      }

      // Check if all prerequisites are completed
      const prerequisiteSkills = allSkills.filter((s) =>
        prerequisites.includes(s.id),
      );

      if (prerequisiteSkills.length === prerequisites.length) {
        const allPrerequisitesCompleted = prerequisiteSkills.every(
          (p) => p.completedAt !== null,
        );

        if (allPrerequisitesCompleted) {
          unlockedSkills.push(skill);
        }
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

    const prerequisiteSkills = await this.db
      .select()
      .from(roadmapSkills)
      .where(inArray(roadmapSkills.id, prerequisites));

    return prerequisiteSkills.every((p) => p.completedAt !== null);
  }

  async createManySkills(
    skills: Partial<RoadmapSkill>[],
    tx?: DBDrizzleTransaction,
  ): Promise<RoadmapSkill[]> {
    const dbInstance = tx ?? this.db;

    const result = await dbInstance
      .insert(roadmapSkills)
      .values(skills as RoadmapSkill[])
      .returning();

    return result;
  }
}
