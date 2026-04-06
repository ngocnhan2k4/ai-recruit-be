import { GeneralQuery } from "@/common/types";
import { FeedbackStatusEnum, User } from ".";

export interface FeedbackFilter extends GeneralQuery {
  assignedToUserId?: User["id"];
  startDate?: Date;
  endDate?: Date;
  status?: FeedbackStatusEnum;
}

export interface FeedbackTrends {
  date: string;
  count: number;
}

export interface FeedbackTrendsQuery {
  fromDate?: string;
  toDate?: string;
}
