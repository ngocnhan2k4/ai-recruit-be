import { Company } from "@/core/entities";
import { IGenericRepository } from "./generic-repository.abstract";

export interface CreateCompanyData {
  name: string;
}

export abstract class ICompanyRepository extends IGenericRepository<Company> {
  abstract getAllCompanies(): Promise<
    Pick<Company, "id" | "name" | "logoUrl" | "address">[]
  >;
}
