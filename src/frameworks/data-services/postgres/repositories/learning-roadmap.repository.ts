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
  roadmapPhaseTranslation,
  roadmapPhases,
  roadmapSkillTranslation,
  roadmapSkills,
  roadmapSkillOptions,
  skills,
  subpaths,
} from "../models";
import { GeneralQuery, PaginatedResult } from "@/common/types";
import {
  eq,
  and,
  SQL,
  isNull,
  desc,
  lt,
  inArray,
  ilike,
  or,
} from "drizzle-orm";
import {
  buildLanguagePriority,
  getCurrentWeekNumber,
  getFallbackLanguage,
  getRequestLanguage,
} from "@/common/utils";

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

    const keyword = query.keyword?.trim();
    if (keyword) {
      const pattern = `%${keyword}%`;
      const keywordCondition = or(
        ilike(learningRoadmaps.title, pattern),
        ilike(learningRoadmaps.targetRole, pattern),
        ilike(learningRoadmaps.currentRole, pattern),
      );
      if (keywordCondition) {
        whereConditions.push(keywordCondition);
      }
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
    const requestLanguage = getRequestLanguage();
    const fallbackLanguage = getFallbackLanguage();
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

    const phaseTranslationMap = await this.getRoadmapPhaseTranslationsMap(
      phases.map((phase) => phase.id),
      requestLanguage,
      fallbackLanguage,
    );

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

        const skillTranslationMap = await this.getRoadmapSkillTranslationsMap(
          phaseSkills.map((skill) => skill.id),
          requestLanguage,
          fallbackLanguage,
        );

        // Batch fetch all options for all skills in this phase
        const skillIds = phaseSkills.map((s) => s.id);
        const allOptions =
          skillIds.length > 0
            ? await this.db
                .select()
                .from(roadmapSkillOptions)
                .where(
                  and(
                    inArray(roadmapSkillOptions.roadmapSkillId, skillIds),
                    isNull(roadmapSkillOptions.deletedAt),
                  ),
                )
            : [];

        // Batch check which (optionName, targetRole, currentRole) tuples have subpaths
        const targetRole = roadmap[0].targetRole;
        const currentRole = roadmap[0].currentRole ?? "";
        const allOptionNames = [
          ...new Set(allOptions.map((o) => o.optionName || o.optionId)),
        ];
        const existingSubpathNames = new Set<string>();
        if (allOptionNames.length > 0) {
          const subpathRows = await this.db
            .select({ optionName: subpaths.optionName })
            .from(subpaths)
            .where(
              and(
                inArray(subpaths.optionName, allOptionNames),
                eq(subpaths.targetRole, targetRole),
                eq(subpaths.currentRole, currentRole),
                isNull(subpaths.deletedAt),
              ),
            );
          for (const row of subpathRows)
            existingSubpathNames.add(row.optionName);
        }

        // Group options by skill and attach enriched data
        const optionsBySkill = new Map<string, typeof allOptions>();
        for (const opt of allOptions) {
          const list = optionsBySkill.get(opt.roadmapSkillId) ?? [];
          list.push(opt);
          optionsBySkill.set(opt.roadmapSkillId, list);
        }

        const skillsWithOptions = phaseSkills.map((skill) => {
          const options = optionsBySkill.get(skill.id) ?? [];
          const enrichedOptions = options.map((option) => {
            const optionName = option.optionName || option.optionId;
            return {
              ...option,
              optionName,
              hasSubpath: existingSubpathNames.has(optionName),
            };
          });
          return {
            ...skill,
            skill: skillTranslationMap[skill.id]?.skill || skill.skill,
            description:
              skillTranslationMap[skill.id]?.description || skill.description,
            options: enrichedOptions,
          };
        });

        return {
          ...phase,
          name: phaseTranslationMap[phase.id]?.name || phase.name,
          description:
            phaseTranslationMap[phase.id]?.description || phase.description,
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

    // Batch fetch all options for all skills in one query
    const skillIds = allSkills.map((r) => r.roadmap_skills.id);
    const allOptions =
      skillIds.length > 0
        ? await this.db
            .select({
              roadmapSkillId: roadmapSkillOptions.roadmapSkillId,
              completedAt: roadmapSkillOptions.completedAt,
            })
            .from(roadmapSkillOptions)
            .where(
              and(
                inArray(roadmapSkillOptions.roadmapSkillId, skillIds),
                isNull(roadmapSkillOptions.deletedAt),
              ),
            )
        : [];

    // Skill is completed if at least one of its options has completedAt set
    const completedSkillIds = new Set(
      allOptions
        .filter((o) => o.completedAt !== null)
        .map((o) => o.roadmapSkillId),
    );
    const completedSkills = completedSkillIds.size;

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

    const skillIds = currentSkills.map((cs) => cs.skillId);
    const skillRows = await this.db
      .select({ id: skills.id, name: skills.name })
      .from(skills)
      .where(inArray(skills.id, skillIds));

    const nameMap = new Map(skillRows.map((r) => [r.id, r.name]));

    return currentSkills.map((cs) => ({
      ...cs,
      skillName: nameMap.get(cs.skillId) ?? "",
    }));
  }

  private async getRoadmapPhaseTranslationsMap(
    phaseIds: string[],
    requestLanguage: string,
    fallbackLanguage: string,
  ) {
    if (!phaseIds.length) {
      return {} as Record<string, { name: string; description: string }>;
    }

    const languagePriority = buildLanguagePriority(
      requestLanguage,
      fallbackLanguage,
    );
    if (!languagePriority.length) {
      return {};
    }

    const rows = await this.db
      .select({
        phaseId: roadmapPhaseTranslation.phaseId,
        languageCode: roadmapPhaseTranslation.languageCode,
        name: roadmapPhaseTranslation.name,
        description: roadmapPhaseTranslation.description,
      })
      .from(roadmapPhaseTranslation)
      .where(
        and(
          inArray(roadmapPhaseTranslation.phaseId, phaseIds),
          inArray(roadmapPhaseTranslation.languageCode, languagePriority),
          isNull(roadmapPhaseTranslation.deletedAt),
        ),
      );

    const map: Record<string, { name: string; description: string }> = {};
    for (const id of phaseIds) {
      const found = rows.find(
        (row) => row.phaseId === id && row.languageCode === languagePriority[0],
      );
      const fallback = rows.find(
        (row) => row.phaseId === id && row.languageCode === languagePriority[1],
      );
      map[id] = {
        name: found?.name || fallback?.name || "",
        description: found?.description || fallback?.description || "",
      };
    }

    return map;
  }

  private async getRoadmapSkillTranslationsMap(
    skillIds: string[],
    requestLanguage: string,
    fallbackLanguage: string,
  ) {
    if (!skillIds.length) {
      return {} as Record<string, { skill: string; description: string }>;
    }

    const languagePriority = buildLanguagePriority(
      requestLanguage,
      fallbackLanguage,
    );
    if (!languagePriority.length) {
      return {};
    }

    const rows = await this.db
      .select({
        skillId: roadmapSkillTranslation.skillId,
        languageCode: roadmapSkillTranslation.languageCode,
        skill: roadmapSkillTranslation.skill,
        description: roadmapSkillTranslation.description,
      })
      .from(roadmapSkillTranslation)
      .where(
        and(
          inArray(roadmapSkillTranslation.skillId, skillIds),
          inArray(roadmapSkillTranslation.languageCode, languagePriority),
          isNull(roadmapSkillTranslation.deletedAt),
        ),
      );

    const map: Record<string, { skill: string; description: string }> = {};
    for (const id of skillIds) {
      const found = rows.find(
        (row) => row.skillId === id && row.languageCode === languagePriority[0],
      );
      const fallback = rows.find(
        (row) => row.skillId === id && row.languageCode === languagePriority[1],
      );

      map[id] = {
        skill: found?.skill || fallback?.skill || "",
        description: found?.description || fallback?.description || "",
      };
    }

    return map;
  }
}
