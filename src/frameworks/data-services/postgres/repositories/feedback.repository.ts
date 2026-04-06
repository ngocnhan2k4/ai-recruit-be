import { GenericRepository } from "./generic-repository";
import { type DBDrizzle } from "../types";
import { Inject, Injectable } from "@nestjs/common";
import { feedbacks } from "../models/feedback.model";
import { Feedback } from "@/core/entities";
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
} from "drizzle-orm";
import { startOfDay, endOfDay } from "date-fns";
import { FeedbackFilter, FeedbackTrends, FeedbackTrendsQuery } from "@/core";
import { PaginatedResult } from "@/common/types";
import { convertDateToStr } from "@/common/utils";

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
  ): Promise<PaginatedResult<Feedback>> {
    const whereConditions: SQL[] = [isNull(feedbacks.deletedAt)];

    if (filter.userId) {
      whereConditions.push(eq(feedbacks.userId, filter.userId));
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

    console.log("filter", filter);

    const feedbacksResult = await this.db
      .select()
      .from(feedbacks)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(feedbacks.createdAt))
      .limit(filter.limit)
      .offset((filter.page! - 1) * filter.limit);

    const total = await this.db
      .select({ count: count() })
      .from(feedbacks)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

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
