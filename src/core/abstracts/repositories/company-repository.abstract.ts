import { Company, OrganizationWithDetails } from "@/core/entities";
import { IGenericRepository } from "./generic-repository.abstract";
import { PaginatedResult } from "@/common/types/api";
import {
  CompanyDto,
  UpdateCompanyDto,
} from "@/interfaces/dtos/companies/company.dto";

export interface CreateCompanyData {
  name: string;
}
export abstract class ICompanyRepository extends IGenericRepository<Company> {
  abstract getAllCompanies(): Promise<
    Pick<OrganizationWithDetails, "id" | "name" | "logoUrl" | "address">[]
  >;

  abstract getCompanies(
    limit: number,
    keyword?: string,
    cursor?: string,
  ): Promise<
    PaginatedResult<
      Pick<OrganizationWithDetails, "id" | "name" | "logoUrl" | "address">
    >
  >;

  // abstract getCompaniesByUserId(
  //   userId: string,
  //   limit: number,
  //   cursor: string,
  // ): Promise<
  //   PaginatedResult<
  //     Pick<
  //       OrganizationWithDetails,
  //       "id" | "name" | "logoUrl" | "description" | "foundedYear"
  //     > & { role: string }
  //   >
  // >;

  abstract getCompanyByOrganizationId(
    organizationId: string,
    companyId: string,
  ): Promise<OrganizationWithDetails | null>;
  abstract updateCompanyById(
    organizationId: string,
    companyId: string,
    data: UpdateCompanyDto,
  ): Promise<Company | null>;
}
