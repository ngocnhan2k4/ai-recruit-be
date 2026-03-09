import { GeneralQuery } from "@/common/types";

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

export interface OrganizationTrends {
  date: string;
  count: number;
}

export interface OrganizationTrendsQuery {
  fromDate?: string;
  toDate?: string;
}
