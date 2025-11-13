import { GeneralQuery } from "@/common/types/api";

export interface OrganizationQuery extends GeneralQuery {
  employeeMin?: number;
  employeeMax?: number;
  verified?: boolean;
  provinceIds?: string[];
  organizationType?: string;
}

export interface MyOrganizationQuery extends GeneralQuery {
  userId?: string;
}
