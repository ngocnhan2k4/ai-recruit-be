import { Company } from "@/core/entities";
import { IGenericRepository } from "./generic-repository.abstract";

export interface CreateCompanyData {
  name: string;
}
export abstract class ICompanyRepository extends IGenericRepository<Company> {
  abstract getAllSimple(): Promise<{ id: string; name: string }[]>;

  abstract getAllCompanies(): Promise<
    Pick<Company, "id" | "name" | "logoUrl" | "address">[]
  >;
}
