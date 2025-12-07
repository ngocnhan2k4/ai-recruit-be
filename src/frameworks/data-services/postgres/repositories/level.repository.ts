import { ILevelRepository, Level } from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { levels } from "../models";
import { eq, and, gte, lte } from "drizzle-orm";

@Injectable()
export class LevelRepository
  extends GenericRepository<Level, typeof levels>
  implements ILevelRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, levels);
  }

  async getLevelsByArea(areaId: string): Promise<Level[]> {
    return await this.db.select().from(levels).where(eq(levels.areaId, areaId));
  }

  async findLevelByScore(areaId: string, score: number): Promise<Level | null> {
    const result = await this.db
      .select()
      .from(levels)
      .where(
        and(
          eq(levels.areaId, areaId),
          lte(levels.minScore, score),
          gte(levels.maxScore, score),
        ),
      )
      .limit(1);

    return result[0] || null;
  }

  async createMany(levelValues: Partial<Level>[]): Promise<Level[]> {
    const result = await this.db
      .insert(levels)
      .values(levelValues as any)
      .returning();

    return result;
  }
}
