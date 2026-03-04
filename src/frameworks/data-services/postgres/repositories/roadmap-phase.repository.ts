import { IRoadmapPhaseRepository, RoadmapPhase, PhaseStatusEnum } from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle, DBDrizzleTransaction } from "../types";
import { roadmapPhases, roadmapSkills, roadmapSkillOptions } from "../models";
import { eq, and, isNull } from "drizzle-orm";

@Injectable()
export class RoadmapPhaseRepository
  extends GenericRepository<RoadmapPhase, typeof roadmapPhases>
  implements IRoadmapPhaseRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, roadmapPhases);
  }

  async getPhasesByRoadmapId(roadmapId: string): Promise<RoadmapPhase[]> {
    return await this.db
      .select()
      .from(roadmapPhases)
      .where(
        and(
          eq(roadmapPhases.roadmapId, roadmapId),
          isNull(roadmapPhases.deletedAt),
        ),
      )
      .orderBy(roadmapPhases.orderIndex);
  }

  async createPhases(phases: Partial<RoadmapPhase>[]): Promise<RoadmapPhase[]> {
    const dbInstance = this.db;

    const result = await dbInstance
      .insert(roadmapPhases)
      .values(phases as any)
      .returning();

    return result;
  }

  async markPhaseCompleted(
    phaseId: string,
    tx?: DBDrizzleTransaction,
  ): Promise<RoadmapPhase> {
    const dbInstance = tx ?? this.db;

    const result = await dbInstance
      .update(roadmapPhases)
      .set({
        progress: "100.00",
        status: PhaseStatusEnum.COMPLETED,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(roadmapPhases.id, phaseId))
      .returning();

    return result[0];
  }

  async updatePhaseProgress(
    phaseId: string,
    tx?: DBDrizzleTransaction,
  ): Promise<RoadmapPhase | null> {
    const dbInstance = tx ?? this.db;

    // Get all skills in this phase
    const skills = await dbInstance
      .select()
      .from(roadmapSkills)
      .where(
        and(
          eq(roadmapSkills.phaseId, phaseId),
          isNull(roadmapSkills.deletedAt),
        ),
      );

    const totalSkills = skills.length;

    if (totalSkills === 0) {
      return null;
    }

    // Count completed skills (skill is completed if ANY option is completed)
    let completedSkills = 0;
    let firstCompletedAt: Date | null = null;

    for (const skill of skills) {
      const options = await dbInstance
        .select()
        .from(roadmapSkillOptions)
        .where(
          and(
            eq(roadmapSkillOptions.roadmapSkillId, skill.id),
            isNull(roadmapSkillOptions.deletedAt),
          ),
        );

      const completedOption = options.find((opt) => opt.completedAt !== null);
      if (completedOption) {
        completedSkills++;
        if (
          !firstCompletedAt ||
          (completedOption.completedAt ?? new Date()) < firstCompletedAt
        ) {
          firstCompletedAt = completedOption.completedAt;
        }
      }
    }

    const progress = (completedSkills / totalSkills) * 100;

    // Determine status
    let status: PhaseStatusEnum = PhaseStatusEnum.NOT_STARTED;
    let startedAt: Date | null = null;
    let completedAt: Date | null = null;

    const phase = await this.get(phaseId);

    if (completedSkills > 0 && completedSkills < totalSkills) {
      status = PhaseStatusEnum.IN_PROGRESS;
      startedAt = phase?.startedAt || firstCompletedAt || new Date();
    } else if (completedSkills === totalSkills) {
      status = PhaseStatusEnum.COMPLETED;
      completedAt = new Date();
      startedAt = phase?.startedAt || firstCompletedAt;
    }

    // Update phase
    const [updated] = await dbInstance
      .update(roadmapPhases)
      .set({
        progress: progress.toFixed(2),
        status,
        startedAt,
        completedAt,
        updatedAt: new Date(),
      })
      .where(eq(roadmapPhases.id, phaseId))
      .returning();

    return updated;
  }
}
