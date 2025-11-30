import { IRoadmapPhaseRepository, RoadmapPhase } from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle, DBDrizzleTransaction } from "../types";
import { roadmapPhases } from "../models";
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
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(roadmapPhases.id, phaseId))
      .returning();

    return result[0];
  }
}
