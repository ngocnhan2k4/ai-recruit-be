import {
  ILearningRoadmapRepository,
  LearningRoadmap,
  LearningRoadmapWithDetails,
  RoadmapProgressStats,
  SkillLevel,
} from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import {
  learningRoadmaps,
  roadmapPhases,
  roadmapSkills,
  roadmapSkillOptions,
  skills,
} from "../models";
import { GeneralQuery, PaginatedResult } from "@/common/types";
import { eq, and, SQL, isNull, desc, lt } from "drizzle-orm";
import { getCurrentWeekNumber } from "@/common/utils";

@Injectable()
export class LearningRoadmapRepository
  extends GenericRepository<LearningRoadmap, typeof learningRoadmaps>
  implements ILearningRoadmapRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, learningRoadmaps);
  }

  async getPaginatedRoadmaps(
    query: GeneralQuery & { userId: string },
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

    // Enrich currentSkills with skillName
    const enrichedData = await Promise.all(
      data.map(async (roadmap) => {
        const enrichedCurrentSkills = await this.enrichCurrentSkills(
          roadmap.currentSkills as SkillLevel[] | null,
        );
        return {
          ...roadmap,
          currentSkills: enrichedCurrentSkills,
        };
      }),
    );

    const nextCursor =
      hasNextPage && data.length > 0
        ? data[data.length - 1].createdAt.toISOString()
        : null;

    return {
      data: enrichedData,
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

        // Fetch options for each skill
        const skillsWithOptions = await Promise.all(
          phaseSkills.map(async (skill) => {
            const options = await this.db
              .select()
              .from(roadmapSkillOptions)
              .where(
                and(
                  eq(roadmapSkillOptions.roadmapSkillId, skill.id),
                  isNull(roadmapSkillOptions.deletedAt),
                ),
              );

            // Enrich each option with optionName and proficiencyLevels from skills table
            const enrichedOptions = await Promise.all(
              options.map(async (option) => {
                const skillResult = await this.db
                  .select({
                    name: skills.name,
                    proficiencyLevels: skills.proficiencyLevels,
                  })
                  .from(skills)
                  .where(eq(skills.id, option.optionId))
                  .limit(1);

                return {
                  ...option,
                  optionName: skillResult[0]?.name || "",
                  proficiencyLevels: skillResult[0]?.proficiencyLevels || null,
                };
              }),
            );

            return {
              ...skill,
              options: enrichedOptions,
            };
          }),
        );

        return {
          ...phase,
          skills: skillsWithOptions,
        };
      }),
    );

    // Enrich currentSkills with skillName
    const enrichedCurrentSkills = await this.enrichCurrentSkills(
      roadmap[0].currentSkills as SkillLevel[] | null,
    );

    return {
      ...roadmap[0],
      currentSkills: enrichedCurrentSkills,
      phases: phasesWithSkills,
      currentWeek: getCurrentWeekNumber(roadmap[0].startDate),
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

    const totalSkills = allSkills.length;

    // For each skill, check if any option has been completed
    const completedSkillsCount = await Promise.all(
      allSkills.map(async (skillRow) => {
        const skill = skillRow.roadmap_skills;
        const completedOptions = await this.db
          .select()
          .from(roadmapSkillOptions)
          .where(
            and(
              eq(roadmapSkillOptions.roadmapSkillId, skill.id),
              isNull(roadmapSkillOptions.deletedAt),
            ),
          );

        // Skill is completed if any option is completed
        return completedOptions.some((opt) => opt.completedAt !== null) ? 1 : 0;
      }),
    );

    const completedSkills = completedSkillsCount.reduce((a, b) => a + b, 0);

    const overallProgress =
      totalSkills > 0 ? (completedSkills / totalSkills) * 100 : 0;

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
      totalSkills,
      completedSkills,
      totalPhases,
      completedPhases,
      overallProgress: Math.round(overallProgress * 100) / 100,
      estimatedCompletionDate,
    };
  }

  async updateProgress(roadmapId: string, tx?: any): Promise<void> {
    const stats = await this.getProgressStats(roadmapId);
    const dbContext = tx || this.db;

    await dbContext
      .update(learningRoadmaps)
      .set({
        overallProgress: stats.overallProgress.toFixed(2),
        updatedAt: new Date(),
        ...(stats.overallProgress === 100 && { completedAt: new Date() }),
      })
      .where(eq(learningRoadmaps.id, roadmapId));
  }

  private async enrichCurrentSkills(
    currentSkills: SkillLevel[] | null,
  ): Promise<SkillLevel[]> {
    if (!currentSkills || currentSkills.length === 0) {
      return [];
    }

    const enriched = await Promise.all(
      currentSkills.map(async (cs) => {
        const skillResult = await this.db
          .select({ name: skills.name })
          .from(skills)
          .where(eq(skills.id, cs.skillId))
          .limit(1);

        return {
          ...cs,
          skillName: skillResult[0]?.name || "",
        };
      }),
    );

    return enriched;
  }
}
