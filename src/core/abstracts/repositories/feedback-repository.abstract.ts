import { PaginatedResult } from "@/common/types";
import { IGenericRepository } from "./generic-repository.abstract";
import {
  Feedback,
  FeedbackFilter,
  FeedbackTrends,
  FeedbackTrendsQuery,
} from "@/core";

export abstract class IFeedbackRepository extends IGenericRepository<Feedback> {
  abstract getFeedbacks(
    filter: FeedbackFilter,
  ): Promise<PaginatedResult<Feedback>>;
  abstract getFeedbackTrends(
    params: FeedbackTrendsQuery,
  ): Promise<FeedbackTrends[]>;
}
