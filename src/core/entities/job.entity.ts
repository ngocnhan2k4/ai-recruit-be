export interface StatisticsJobFilter {
  fromDate?: Date;
  toDate?: Date;
  categoryId?: string;
  provinceId?: string;
  isOpen?: boolean;
}

export interface RangeFilter {
  min?: number;
  max?: number;
}

export interface JobFilters {
  keyword?: string;
  salaryRange?: RangeFilter;
  experienceRange?: RangeFilter;
  provinceId?: string;
  companyId?: string;
  workType?: string;
  status?: string;
}

export interface CursorPaginationResult<T> {
  data: T[];
  nextCursor?: string;
  hasNextPage: boolean;
}
