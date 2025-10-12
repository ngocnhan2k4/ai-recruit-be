import { Company } from "@/core/entities";
import { IGenericRepository } from "./generic-repository.abstract";
import { PaginatedResult } from "@/common/types/api";

export interface CreateCompanyData {
  name: string;
}
export abstract class ICompanyRepository extends IGenericRepository<Company> {
  abstract getAllSimple(): Promise<{ id: string; name: string }[]>;

  abstract getAllCompanies(): Promise<
    Pick<Company, "id" | "name" | "logoUrl" | "address">[]
  >;

  abstract getCompaniesByUserId(
    userId: string,
    limit: number,
    cursor: string,
  ): Promise<
    PaginatedResult<
      Pick<
        Company,
        "id" | "name" | "logoUrl" | "description" | "createdAt" | "foundingYear"
      > & { role: string }
    >
  >;
}
