import { GeneralQuery, RelatedEntity } from "@/common/types";
import { Feedback, FeedbackStatusEnum, FeedbackTypeEnum, User } from ".";

export interface FeedbackFilter extends GeneralQuery {
  assignedToUserId?: User["id"];
  startDate?: Date;
  endDate?: Date;
  status?: FeedbackStatusEnum;
  type?: FeedbackTypeEnum;
}

export interface FeedbackTrends {
  date: string;
  count: number;
}

export interface FeedbackTrendsQuery {
  fromDate?: string;
  toDate?: string;
}

export interface ListFeedbackResponse extends Feedback {
  assignedToUser?: RelatedEntity;
}
