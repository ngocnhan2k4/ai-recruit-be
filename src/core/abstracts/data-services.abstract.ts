import { User, RefreshToken, Company, Category, Job, Skill } from "../entities";
import { Province } from "../entities/province.entity";
import {
  IGenericRepository,
  IAuthGenericRepository,
  IJobGenericRepository,
  ICategoryGenericRepository,
  IProvinceGenericRepository,
} from "./generic-repository.abstract";

export abstract class IDataServices {
  abstract users: IGenericRepository<User>;
  abstract refreshTokens: IAuthGenericRepository<RefreshToken>;
  abstract jobs: IJobGenericRepository<Job, Province, Company, Skill>;
  abstract categories: ICategoryGenericRepository<Category>;
  abstract provinces: IProvinceGenericRepository<Province>;

  // other repositories
}
