import { User, RefreshToken, Company, Category, Job } from "../entities";
import {
  IGenericRepository,
  IAuthGenericRepository,
  IJobGenericRepository,
  ICategoryGenericRepository,
} from "./generic-repository.abstract";

export abstract class IDataServices {
  abstract users: IGenericRepository<User>;
  abstract refreshTokens: IAuthGenericRepository<RefreshToken>;
  abstract jobs: IJobGenericRepository<Job, Company, string>;
  abstract categories: ICategoryGenericRepository<Category>;

  // other repositories
}
