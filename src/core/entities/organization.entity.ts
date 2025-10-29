import { GeneralQuery } from "@/common/types/api";

export interface OrganizationQuery extends GeneralQuery {
  userId?: string;
  employeeMin?: number;
  employeeMax?: number;
  verified?: boolean;
  provinceIds?: string[];
  organizationType?: string;
}
