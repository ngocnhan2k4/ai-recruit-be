import { SchoolTypeEnum } from "./enum.entity";

export interface SchoolFilters {
  keyword?: string;
  schoolType?: SchoolTypeEnum;
  verified?: boolean;
  provinceIds?: string[];
}
