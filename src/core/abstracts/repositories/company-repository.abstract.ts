import { Company } from "@/core/entities";
import { IGenericRepository } from "./generic-repository.abstract";
import { PaginatedResult } from "@/common/types/api";

export interface CreateCompanyData {
  name: string;
}
export abstract class ICompanyRepository extends IGenericRepository<Company> {
  abstract getAllCompanies(): Promise<
    Pick<Company, "id" | "name" | "logoUrl" | "address">[]
  >;

  abstract getCompanies(
    limit: number,
    keyword?: string,
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
