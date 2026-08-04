import type { Activity, ActivitySearchFilters } from "@/core/entities/activity";
import { PaginatedResult } from "@/common/types";
import { type DBDrizzle } from "../types";
import { activities } from "../models/activity.model";
import { IActivityRepository } from "@/core/abstracts/repositories/activity-repository.abstract";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { and, asc, desc, eq, gt, gte, lt, lte, or, SQL } from "drizzle-orm";
import { GenericRepository } from "./generic-repository";

@Injectable()
export class ActivityRepository
  extends GenericRepository<Activity, typeof activities>
  implements IActivityRepository
{
  private readonly logger = new Logger(ActivityRepository.name);

  constructor(@Inject("DRIZZLE") protected readonly db: DBDrizzle) {
    super(db, activities);
  }

  async getListActivities(
    filters: ActivitySearchFilters,
  ): Promise<PaginatedResult<Activity>> {
    const limit = filters.limit ?? 20;
    const whereConditions = this.buildWhere(filters);

    if (filters.cursor) {
      const cursorCondition = this.parseCursorCondition(filters.cursor);
      if (cursorCondition) {
        whereConditions.push(cursorCondition);
      }
    }

    const rows = await this.db
      .select()
      .from(activities)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(activities.createdAt), asc(activities.id))
      .limit(limit + 1);

    const hasNextPage = rows.length > limit;
    const pageRows = hasNextPage ? rows.slice(0, limit) : rows;

    let nextCursor: string | undefined;
    if (hasNextPage && pageRows.length > 0) {
      const last = pageRows[pageRows.length - 1];
      nextCursor = Buffer.from(
        JSON.stringify([last.createdAt.toISOString(), last.id]),
      ).toString("base64");
    }

    return {
      data: pageRows,
      pagination: {
        hasNextPage,
        nextCursor,
      },
    };
  }

  async getActivityById(id: string): Promise<Activity | null> {
    const [row] = await this.db
      .select()
      .from(activities)
      .where(eq(activities.id, id))
      .limit(1);

    return row;
  }

  private buildWhere(filters: ActivitySearchFilters): SQL[] {
    const whereConditions: SQL[] = [];

    if (filters.targetType !== undefined) {
      whereConditions.push(eq(activities.targetType, filters.targetType));
    }
    if (filters.action) {
      whereConditions.push(eq(activities.action, filters.action));
    }
    if (filters.createdBy) {
      whereConditions.push(eq(activities.createdBy, filters.createdBy));
    }
    if (filters.organizationId) {
      whereConditions.push(
        eq(activities.organizationId, filters.organizationId),
      );
    }
    if (filters.targetId) {
      whereConditions.push(eq(activities.targetId, filters.targetId));
    }
    if (filters.visibility) {
      whereConditions.push(eq(activities.visibility, filters.visibility));
    }
    if (filters.actorOrTargetId) {
      whereConditions.push(
        or(
          eq(activities.createdBy, filters.actorOrTargetId),
          eq(activities.targetId, filters.actorOrTargetId),
        )!,
      );
    }
    if (filters.from) {
      whereConditions.push(gte(activities.createdAt, new Date(filters.from)));
    }
    if (filters.to) {
      whereConditions.push(lte(activities.createdAt, new Date(filters.to)));
    }

    return whereConditions;
  }

  private parseCursorCondition(cursor: string): SQL | null {
    try {
      const [createdAtIso, id] = JSON.parse(
        Buffer.from(cursor, "base64").toString(),
      ) as [string, string];

      if (!createdAtIso || !id) {
        return null;
      }

      const cursorDate = new Date(createdAtIso);
      return or(
        lt(activities.createdAt, cursorDate),
        and(eq(activities.createdAt, cursorDate), gt(activities.id, id)),
      )!;
    } catch {
      this.logger.warn("Invalid activity list cursor");
      return null;
    }
  }
}
