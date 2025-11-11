import { GenericRepository } from "./generic-repository";
import { type DBDrizzle } from "../types";
import { Inject, Injectable } from "@nestjs/common";
import { feedbacks } from "../models/feedback.model";
import { Feedback } from "@/core/entities";
import { IFeedbackRepository } from "@/core/abstracts/repositories/feedback-repository.abstract";
import { eq, and, desc, SQL, count, gte, lte } from "drizzle-orm";
import { FeedbackFilter } from "@/core/entities/feedback.entity";
import { PaginatedResult } from "@/common/types/api";

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
    const whereConditions: SQL[] = [];

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

    const feedbacksResult = await this.db
      .select()
      .from(feedbacks)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(feedbacks.createdAt))
      .limit(filter.limit + 1)
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
}
