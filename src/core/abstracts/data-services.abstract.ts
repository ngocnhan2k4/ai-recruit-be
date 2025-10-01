import {
  User,
  RefreshToken,
  Company,
  Category,
  Job,
  Skill,
  Province,
} from "../entities";
import {
  IGenericRepository,
  IAuthGenericRepository,
  IJobGenericRepository,
  ICategoryGenericRepository,
} from "./generic-repository.abstract";

export abstract class IDataServices {
  abstract users: IGenericRepository<User>;
  abstract refreshTokens: IAuthGenericRepository<RefreshToken>;
  abstract jobs: IJobGenericRepository<Job, Province, Company, Skill>;
  abstract categories: ICategoryGenericRepository<Category>;

  // other repositories
}
