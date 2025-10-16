import { GeneralQuery } from "@/common/types/api";

export interface GetUserQuery extends GeneralQuery {
  isActive?: boolean;
  isDeleted?: boolean;
}
