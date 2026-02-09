import { GeneralQuery } from "@/common/types";
import { FeedbackStatusEnum, User } from ".";

export interface FeedbackFilter extends GeneralQuery {
  userId?: User["id"];
  startDate?: Date;
  endDate?: Date;
  status?: FeedbackStatusEnum;
}
