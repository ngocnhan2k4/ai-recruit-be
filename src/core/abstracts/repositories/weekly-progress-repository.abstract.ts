import { WeeklyProgress } from "@/core";
import { IGenericRepository } from "./generic-repository.abstract";
import { DBDrizzleTransaction } from "@/frameworks/data-services/postgres/types";

export abstract class IWeeklyProgressRepository extends IGenericRepository<WeeklyProgress> {
  abstract getOrCreateWeeklyProgress(
    roadmapId: string,
    weekNumber: number,
    tx?: DBDrizzleTransaction,
  ): Promise<WeeklyProgress>;

  abstract updateHoursSpent(
    roadmapId: string,
    weekNumber: number,
    hoursSpent: number,
    tx?: DBDrizzleTransaction,
  ): Promise<WeeklyProgress>;

  abstract incrementSkillsCompleted(
    roadmapId: string,
    weekNumber: number,
    tx?: DBDrizzleTransaction,
  ): Promise<void>;

  abstract getWeeklyProgressHistory(
    roadmapId: string,
  ): Promise<WeeklyProgress[]>;
}
