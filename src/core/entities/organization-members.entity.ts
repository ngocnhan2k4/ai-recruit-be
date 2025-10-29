import { GeneralQuery } from "@/common/types/api";

export interface MemberQuery extends GeneralQuery {
  role?: string;
}
