import { Company } from "@/core/entities";
import { IGenericRepository } from "./generic-repository.abstract";
import { PaginatedResult } from "@/common/types/api";
import { CompanyFilters } from "@/core/entities/company.entity";

export abstract class ICompanyRepository extends IGenericRepository<Company> {
  abstract getCompanies(
    limit: number,
    filter?: CompanyFilters,
    cursor?: string,
  ): Promise<
    PaginatedResult<Pick<Company, "id" | "name" | "logoUrl" | "address">>
  >;

  abstract getCompanyByOrganizationId(
    organizationId: string,
  ): Promise<Company | null>;

  // abstract updateCompanyById(
  //   organizationId: string,
  //   data: UpdateCompanyDto,
  // ): Promise<Company | null>;
}
