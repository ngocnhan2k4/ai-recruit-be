import { Injectable, Inject } from "@nestjs/common";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { IRoadmapSkillOptionRepository } from "@/core/abstracts";
import { RoadmapSkillOption } from "@/core";
import { roadmapSkillOptions, roadmapSkills, roadmapPhases } from "../models";
import { DBDrizzleTransaction, type DBDrizzle } from "../types";
import { GenericRepository } from "./generic-repository";

@Injectable()
export class RoadmapSkillOptionRepository
  extends GenericRepository<RoadmapSkillOption, typeof roadmapSkillOptions>
  implements IRoadmapSkillOptionRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, roadmapSkillOptions);
  }

  async getOptionsBySkillId(skillId: string): Promise<RoadmapSkillOption[]> {
    return this.db
      .select()
      .from(roadmapSkillOptions)
      .where(
        and(
          eq(roadmapSkillOptions.roadmapSkillId, skillId),
          isNull(roadmapSkillOptions.deletedAt),
        ),
      );
  }

  async createManyOptions(
    options: Partial<RoadmapSkillOption>[],
    tx?: DBDrizzleTransaction,
  ): Promise<RoadmapSkillOption[]> {
    const database = tx || this.db;
    return database
      .insert(roadmapSkillOptions)
      .values(options as any)
      .returning();
  }

  async markOptionCompleted(
    optionId: string,
    tx?: DBDrizzleTransaction,
  ): Promise<RoadmapSkillOption> {
    const database = tx || this.db;
    const [updated] = await database
      .update(roadmapSkillOptions)
      .set({ completedAt: new Date() })
      .where(eq(roadmapSkillOptions.id, optionId))
      .returning();
    return updated;
  }

  async getSelectedOption(skillId: string): Promise<RoadmapSkillOption> {
    const [option] = await this.db
      .select()
      .from(roadmapSkillOptions)
      .where(
        and(
          eq(roadmapSkillOptions.roadmapSkillId, skillId),
          isNull(roadmapSkillOptions.deletedAt),
        ),
      )
      .limit(1);
    return option || null;
  }

  async getOptionsBySkillIds(
    skillIds: string[],
  ): Promise<RoadmapSkillOption[]> {
    if (skillIds.length === 0) return [];
    return this.db
      .select()
      .from(roadmapSkillOptions)
      .where(
        and(
          inArray(roadmapSkillOptions.roadmapSkillId, skillIds),
          isNull(roadmapSkillOptions.deletedAt),
        ),
      );
  }

  async findOptionWithSkillAndPhase(optionId: string): Promise<{
    option: RoadmapSkillOption;
    skillId: string;
    skillPrerequisites: string[];
    phaseId: string;
  } | null> {
    const rows = await this.db
      .select({
        option: roadmapSkillOptions,
        skillId: roadmapSkills.id,
        skillPrerequisites: roadmapSkills.prerequisites,
        phaseId: roadmapPhases.id,
      })
      .from(roadmapSkillOptions)
      .innerJoin(
        roadmapSkills,
        eq(roadmapSkillOptions.roadmapSkillId, roadmapSkills.id),
      )
      .innerJoin(roadmapPhases, eq(roadmapSkills.phaseId, roadmapPhases.id))
      .where(
        and(
          eq(roadmapSkillOptions.id, optionId),
          isNull(roadmapSkillOptions.deletedAt),
          isNull(roadmapSkills.deletedAt),
        ),
      )
      .limit(1);

    if (!rows.length) return null;
    const row = rows[0];
    return {
      option: row.option,
      skillId: row.skillId,
      skillPrerequisites: row.skillPrerequisites ?? [],
      phaseId: row.phaseId,
    };
  }
}
