import { WeeklyProgress } from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle, DBDrizzleTransaction } from "../types";
import { weeklyProgress } from "../models";
import { eq, and, isNull, sql } from "drizzle-orm";
import { IWeeklyProgressRepository } from "@/core/abstracts";

@Injectable()
export class WeeklyProgressRepository
  extends GenericRepository<WeeklyProgress, typeof weeklyProgress>
  implements IWeeklyProgressRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, weeklyProgress);
  }

  async getOrCreateWeeklyProgress(
    roadmapId: string,
    weekNumber: number,
    tx?: DBDrizzleTransaction,
  ): Promise<WeeklyProgress> {
    const dbInstance = tx ?? this.db;

    const existing = await dbInstance
      .select()
      .from(weeklyProgress)
      .where(
        and(
          eq(weeklyProgress.roadmapId, roadmapId),
          eq(weeklyProgress.weekNumber, weekNumber),
          isNull(weeklyProgress.deletedAt),
        ),
      )
      .limit(1);

    if (existing.length > 0) return existing[0];

    const [created] = await dbInstance
      .insert(weeklyProgress)
      .values({ roadmapId, weekNumber })
      .returning();

    return created;
  }

  async updateHoursSpent(
    roadmapId: string,
    weekNumber: number,
    hoursSpent: number,
    tx?: DBDrizzleTransaction,
  ): Promise<WeeklyProgress> {
    const dbInstance = tx ?? this.db;
    const record = await this.getOrCreateWeeklyProgress(
      roadmapId,
      weekNumber,
      tx,
    );

    const [updated] = await dbInstance
      .update(weeklyProgress)
      .set({
        hoursSpent: hoursSpent.toString(),
        updatedAt: new Date(),
      })
      .where(eq(weeklyProgress.id, record.id))
      .returning();

    return updated;
  }

  async incrementSkillsCompleted(
    roadmapId: string,
    weekNumber: number,
    tx?: DBDrizzleTransaction,
  ): Promise<void> {
    const dbInstance = tx ?? this.db;
    const record = await this.getOrCreateWeeklyProgress(
      roadmapId,
      weekNumber,
      tx,
    );

    await dbInstance
      .update(weeklyProgress)
      .set({
        skillsCompletedThisWeek: sql`${weeklyProgress.skillsCompletedThisWeek} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(weeklyProgress.id, record.id));
  }

  async getWeeklyProgressHistory(roadmapId: string): Promise<WeeklyProgress[]> {
    return await this.db
      .select()
      .from(weeklyProgress)
      .where(
        and(
          eq(weeklyProgress.roadmapId, roadmapId),
          isNull(weeklyProgress.deletedAt),
        ),
      )
      .orderBy(weeklyProgress.weekNumber);
  }
}
