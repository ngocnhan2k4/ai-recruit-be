import {
  ILearningRoadmapRepository,
  LearningRoadmap,
  LearningRoadmapWithDetails,
  RoadmapProgressStats,
} from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { learningRoadmaps, roadmapPhases, roadmapSkills } from "../models";
import { GeneralQuery, PaginatedResult } from "@/common/types/api";
import { eq, and, SQL, isNull, desc, lt } from "drizzle-orm";

@Injectable()
export class LearningRoadmapRepository
  extends GenericRepository<LearningRoadmap, typeof learningRoadmaps>
  implements ILearningRoadmapRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, learningRoadmaps);
  }

  async getPaginatedRoadmaps(
    query: GeneralQuery & { userId?: string },
  ): Promise<PaginatedResult<LearningRoadmap>> {
    const whereConditions: SQL[] = [isNull(learningRoadmaps.deletedAt)];

    if (query.userId) {
      whereConditions.push(eq(learningRoadmaps.userId, query.userId));
    }

    if (query.cursor) {
      whereConditions.push(
        lt(learningRoadmaps.createdAt, new Date(query.cursor)),
      );
    }

    const items = await this.db
      .select()
      .from(learningRoadmaps)
      .where(and(...whereConditions))
      .orderBy(desc(learningRoadmaps.createdAt))
      .limit(query.limit + 1);

    const hasNextPage = items.length > query.limit;
    const data = hasNextPage ? items.slice(0, query.limit) : items;

    const nextCursor =
      hasNextPage && data.length > 0
        ? data[data.length - 1].createdAt.toISOString()
        : null;

    return {
      data,
      pagination: {
        nextCursor,
        hasNextPage,
      },
    };
  }

  async getRoadmapWithDetails(
    roadmapId: string,
  ): Promise<LearningRoadmapWithDetails | null> {
    const roadmap = await this.db
      .select()
      .from(learningRoadmaps)
      .where(
        and(
          eq(learningRoadmaps.id, roadmapId),
          isNull(learningRoadmaps.deletedAt),
        ),
      )
      .limit(1);

    if (!roadmap || roadmap.length === 0) {
      return null;
    }

    const phases = await this.db
      .select()
      .from(roadmapPhases)
      .where(
        and(
          eq(roadmapPhases.roadmapId, roadmapId),
          isNull(roadmapPhases.deletedAt),
        ),
      )
      .orderBy(roadmapPhases.orderIndex);

    const phasesWithSkills = await Promise.all(
      phases.map(async (phase) => {
        const phaseSkills = await this.db
          .select()
          .from(roadmapSkills)
          .where(
            and(
              eq(roadmapSkills.phaseId, phase.id),
              isNull(roadmapSkills.deletedAt),
            ),
          )
          .orderBy(roadmapSkills.orderIndex);

        return {
          ...phase,
          skills: phaseSkills,
        };
      }),
    );

    return {
      ...roadmap[0],
      phases: phasesWithSkills,
    };
  }

  async getProgressStats(roadmapId: string): Promise<RoadmapProgressStats> {
    const phases = await this.db
      .select()
      .from(roadmapPhases)
      .where(
        and(
          eq(roadmapPhases.roadmapId, roadmapId),
          isNull(roadmapPhases.deletedAt),
        ),
      );

    const totalPhases = phases.length;
    const completedPhases = phases.filter((p) => p.completedAt !== null).length;

    const allSkills = await this.db
      .select()
      .from(roadmapSkills)
      .innerJoin(roadmapPhases, eq(roadmapSkills.phaseId, roadmapPhases.id))
      .where(
        and(
          eq(roadmapPhases.roadmapId, roadmapId),
          isNull(roadmapSkills.deletedAt),
        ),
      );

    // Group skills by position (phaseId + positionName) to count unique positions
    const positionMap = new Map<
      string,
      { hasCompleted: boolean; skills: any[] }
    >();

    for (const skillRow of allSkills) {
      const skill = skillRow.roadmap_skills;
      const key = `${skill.phaseId}-${skill.positionName}`;

      if (!positionMap.has(key)) {
        positionMap.set(key, { hasCompleted: false, skills: [] });
      }

      positionMap.get(key)!.skills.push(skill);

      // If any option in this position is completed, mark position as completed
      if (skill.completedAt !== null) {
        positionMap.get(key)!.hasCompleted = true;
      }
    }

    const totalPositions = positionMap.size;
    const completedPositions = Array.from(positionMap.values()).filter(
      (p) => p.hasCompleted,
    ).length;

    const overallProgress =
      totalPositions > 0 ? (completedPositions / totalPositions) * 100 : 0;

    // Get roadmap to calculate estimated completion
    const roadmap = await this.db
      .select()
      .from(learningRoadmaps)
      .where(eq(learningRoadmaps.id, roadmapId))
      .limit(1);

    let estimatedCompletionDate: Date | null = null;
    if (roadmap[0] && overallProgress > 0 && overallProgress < 100) {
      const weeksRemaining =
        (roadmap[0].totalWeeks * (100 - overallProgress)) / 100;
      estimatedCompletionDate = new Date();
      estimatedCompletionDate.setDate(
        estimatedCompletionDate.getDate() + weeksRemaining * 7,
      );
    }

    return {
      totalSkills: totalPositions,
      completedSkills: completedPositions,
      totalPhases,
      completedPhases,
      overallProgress: Math.round(overallProgress * 100) / 100,
      estimatedCompletionDate,
    };
  }

  async updateProgress(roadmapId: string): Promise<void> {
    const stats = await this.getProgressStats(roadmapId);

    await this.db
      .update(learningRoadmaps)
      .set({
        overallProgress: stats.overallProgress.toFixed(2),
        updatedAt: new Date(),
        ...(stats.overallProgress === 100 && { completedAt: new Date() }),
      })
      .where(eq(learningRoadmaps.id, roadmapId));
  }
}
