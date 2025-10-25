import { GeneralQuery } from "@/common/types/api";
import { OrganizationTypeEnum } from "./enum.entity";

export interface OrganizationQuery extends GeneralQuery {
  type?: OrganizationTypeEnum;
  verified?: boolean;
  provinceIds?: string[];
}
