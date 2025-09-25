import { User, RefreshToken, JobRaw, CompanyRaw, Category } from "../entities";
import {
  IGenericRepository,
  IAuthGenericRepository,
  IJobGenericRepository,
  ICategoryGenericRepository,
} from "./generic-repository.abstract";

export abstract class IDataServices {
  abstract users: IGenericRepository<User>;
  abstract refreshTokens: IAuthGenericRepository<RefreshToken>;
  abstract jobRaws: IJobGenericRepository<JobRaw, CompanyRaw>;
  abstract categories: ICategoryGenericRepository<Category>;

  // other repositories
}
