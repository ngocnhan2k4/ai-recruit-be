import { GeneralQuery } from "@/common/types";

export interface MemberQuery extends GeneralQuery {
  role?: string;
}
