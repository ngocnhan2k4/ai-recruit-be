import { Company } from "@/core/entities";
import { IGenericRepository } from "./generic-repository.abstract";
import { PaginatedResult } from "@/common/types/api";
import { CompanyFilters } from "@/core/entities/company.entity";

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
