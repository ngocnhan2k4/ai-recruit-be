import { GeneralQuery, RelatedEntity } from "@/common/types";
import { Task, TaskStatusEnum, TaskTypeEnum, User } from ".";

export interface TaskFilter extends GeneralQuery {
  status?: TaskStatusEnum;
  type?: TaskTypeEnum;
  userId?: User["id"];
  startDate?: Date;
  endDate?: Date;
}

export interface ListTaskResponse extends Task {
  user?: RelatedEntity & { email?: string | null };
}
