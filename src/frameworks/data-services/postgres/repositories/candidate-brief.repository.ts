import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import {
  ICandidateBriefRepository,
  type CandidateBriefAnalysis,
  type CandidateBriefRecord,
} from "@/core";
import type { DBDrizzle } from "../types";
import { candidateBriefs } from "../models";

@Injectable()
export class CandidateBriefRepository implements ICandidateBriefRepository {
  constructor(@Inject("DRIZZLE") private readonly db: DBDrizzle) {}

  async findActive(
    applicationId: string,
    organizationId: string,
  ): Promise<CandidateBriefRecord | null> {
    const [brief] = await this.db
      .select()
      .from(candidateBriefs)
      .where(
        and(
          eq(candidateBriefs.applicationId, applicationId),
          eq(candidateBriefs.organizationId, organizationId),
          isNull(candidateBriefs.deletedAt),
        ),
      )
      .limit(1);

    return (brief as CandidateBriefRecord | undefined) ?? null;
  }

  async save(
    applicationId: string,
    organizationId: string,
    createdBy: string,
    analysisResult: CandidateBriefAnalysis,
    inputFingerprint: string,
  ): Promise<CandidateBriefRecord> {
    const current = await this.findActive(applicationId, organizationId);
    const now = new Date();

    if (current) {
      const [updated] = await this.db
        .update(candidateBriefs)
        .set({
          createdBy,
          analysisResult,
          inputFingerprint,
          generatedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(candidateBriefs.id, current.id),
            isNull(candidateBriefs.deletedAt),
          ),
        )
        .returning();

      return updated as CandidateBriefRecord;
    }

    const [created] = await this.db
      .insert(candidateBriefs)
      .values({
        applicationId,
        organizationId,
        createdBy,
        analysisResult,
        inputFingerprint,
        generatedAt: now,
      })
      .returning();

    return created as CandidateBriefRecord;
  }

  async softDelete(
    applicationId: string,
    organizationId: string,
  ): Promise<boolean> {
    const rows = await this.db
      .update(candidateBriefs)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(candidateBriefs.applicationId, applicationId),
          eq(candidateBriefs.organizationId, organizationId),
          isNull(candidateBriefs.deletedAt),
        ),
      )
      .returning({ id: candidateBriefs.id });

    return rows.length > 0;
  }
}
