import { Company } from "@/core/entities";
import { IGenericRepository } from "./generic-repository.abstract";
import { PaginatedResult } from "@/common/types/api";

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

export abstract class ICompanyRepository extends IGenericRepository<Company> {
  abstract getAllCompanies(): Promise<
    Pick<Company, "id" | "name" | "logoUrl" | "address" | "locations">[]
  >;

  abstract getCompanies(
    limit: number,
    filter?: CompanyFilters,
    cursor?: string,
  ): Promise<
    PaginatedResult<Pick<Company, "id" | "name" | "logoUrl" | "address">>
  >;

  abstract checkNameExists(name: string): Promise<boolean>;

  abstract getCompaniesByUserId(
    userId: string,
    limit?: number,
    cursor?: string,
  ): Promise<
    PaginatedResult<
      Pick<
        Company,
        "id" | "name" | "logoUrl" | "description" | "createdAt" | "foundingYear"
      > & { role: string }
    >
  >;
}
