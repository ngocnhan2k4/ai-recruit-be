import { GenericRepository } from "./generic-repository";
import { type DBDrizzle } from "../types";
import { Inject, Injectable } from "@nestjs/common";
import { feedbacks } from "../models/feedback.model";
import { Feedback, ListFeedbackResponse } from "@/core/entities";
import { IFeedbackRepository } from "@/core/abstracts/repositories/feedback-repository.abstract";
import {
  eq,
  and,
  desc,
  SQL,
  count,
  gte,
  lte,
  isNull,
  countDistinct,
  asc,
  sql,
  ilike,
  or,
} from "drizzle-orm";
import { FeedbackFilter, FeedbackTrends, FeedbackTrendsQuery } from "@/core";
import { PaginatedResult, RelatedEntity } from "@/common/types";
import { convertDateToStr } from "@/common/utils";
import { users } from "../models";
import { endOfDay, startOfDay } from "date-fns";

@Injectable()
export class FeedbackRepository
  extends GenericRepository<Feedback, typeof feedbacks>
  implements IFeedbackRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, feedbacks);
  }

  async getFeedbacks(
    filter: FeedbackFilter,
  ): Promise<PaginatedResult<ListFeedbackResponse>> {
    const whereConditions: SQL[] = [isNull(feedbacks.deletedAt)];

    if (filter.assignedToUserId) {
      whereConditions.push(
        eq(feedbacks.assignedToUserId, filter.assignedToUserId),
      );
    }

    if (filter.status) {
      whereConditions.push(eq(feedbacks.status, filter.status));
    }

    if (filter.startDate) {
      whereConditions.push(gte(feedbacks.createdAt, filter.startDate));
    }

    if (filter.endDate) {
      whereConditions.push(lte(feedbacks.createdAt, filter.endDate));
    }

    if (filter.keyword) {
      const keyword = `%${filter.keyword}%`;

      whereConditions.push(
        or(
          ilike(sql`${feedbacks.id}::text`, keyword),
          ilike(feedbacks.name, keyword),
        )!,
      );
    }

    const [feedbacksResult, total] = await Promise.all([
      this.db
        .select({
          id: feedbacks.id,
          name: feedbacks.name,
          email: feedbacks.email,
          message: feedbacks.message,
          subject: feedbacks.subject,
          languageCode: feedbacks.languageCode,
          images: feedbacks.images,
          status: feedbacks.status,
          assignedToUserId: feedbacks.assignedToUserId,
          createdAt: feedbacks.createdAt,
          updatedAt: feedbacks.updatedAt,
          assignedToUser: sql<
            RelatedEntity | undefined
          >`json_build_object('id', ${users.id}, 'name', COALESCE(${users.name}, ${users.email}))`.as(
            "assignedToUser",
          ),
          deletedAt: feedbacks.deletedAt,
          userId: feedbacks.userId,
        })
        .from(feedbacks)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .leftJoin(users, eq(feedbacks.assignedToUserId, users.id))
        .orderBy(desc(feedbacks.createdAt))
        .limit(filter.limit)
        .offset((filter.page! - 1) * filter.limit),
      this.db
        .select({ count: count() })
        .from(feedbacks)
        .where(
          whereConditions.length > 0 ? and(...whereConditions) : undefined,
        ),
    ]);

    return {
      data: feedbacksResult,
      pagination: { total: Number(total[0]?.count ?? 0) },
    };
  }

  async getFeedbackTrends(
    params: FeedbackTrendsQuery,
  ): Promise<FeedbackTrends[]> {
    const { fromDate, toDate } = params;

    const whereConditions: SQL[] = [isNull(feedbacks.deletedAt)];

    if (fromDate) {
      whereConditions.push(
        gte(feedbacks.createdAt, startOfDay(new Date(fromDate))),
      );
    }
    if (toDate) {
      whereConditions.push(
        lte(feedbacks.createdAt, endOfDay(new Date(toDate))),
      );
    }

    const dateExpr = sql`DATE(${feedbacks.createdAt})`;

    const result = await this.db
      .select({
        date: dateExpr,
        count: countDistinct(feedbacks.id).as("count"),
      })
      .from(feedbacks)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .groupBy(dateExpr)
      .orderBy(asc(dateExpr));

    return result.map((r) => ({
      date: convertDateToStr(r.date as string),
      count: Number(r.count),
    }));
  }
}
