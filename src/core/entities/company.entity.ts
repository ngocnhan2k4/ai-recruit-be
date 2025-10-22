export interface CreateCompanyData {
  name: string;
}

export interface EmployeeRange {
  min?: number;
  max?: number;
}

export interface CompanyFilters {
  keyword?: string;
  provinceIds?: string[];
  employeeRange?: EmployeeRange;
  verified?: boolean;
}
