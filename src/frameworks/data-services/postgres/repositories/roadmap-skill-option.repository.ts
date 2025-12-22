import { Injectable, Inject } from "@nestjs/common";
import { eq, and, isNull } from "drizzle-orm";
import { IRoadmapSkillOptionRepository } from "@/core/abstracts";
import { RoadmapSkillOption } from "@/core";
import { roadmapSkillOptions } from "../models";
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
}
