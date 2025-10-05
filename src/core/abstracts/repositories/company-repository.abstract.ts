import { Company } from "../../entities";
import { IGenericRepository } from "./generic-repository.abstract";

export abstract class ICompanyRepository extends IGenericRepository<Company> {
  abstract getAllSimple(): Promise<{ id: string; name: string }[]>;
}
