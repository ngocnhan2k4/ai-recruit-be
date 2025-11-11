import { PaginatedResult } from "@/common/types/api";
import { IGenericRepository } from "./generic-repository.abstract";
import { Feedback } from "@/core/entities";
import { FeedbackFilter } from "@/core/entities/feedback.entity";

export abstract class IFeedbackRepository extends IGenericRepository<Feedback> {
  abstract getFeedbacks(
    filter: FeedbackFilter,
  ): Promise<PaginatedResult<Feedback>>;
}
