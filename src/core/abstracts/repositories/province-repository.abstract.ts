import { IGenericRepository } from "./generic-repository.abstract";
import { Province } from "@/core/entities";

//  eslint-disable-next-line @typescript-eslint/no-empty-object-type
export abstract class IProvinceRepository extends IGenericRepository<Province> {}
