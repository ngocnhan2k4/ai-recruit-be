import { User, RefreshToken, JobRaw, CompanyRaw } from "../entities";
import {
  IGenericRepository,
  IAuthGenericRepository,
  IJobGenericRepository,
} from "./generic-repository.abstract";

export abstract class IDataServices {
  abstract users: IGenericRepository<User>;
  abstract refreshTokens: IAuthGenericRepository<RefreshToken>;
  abstract jobRaws: IJobGenericRepository<JobRaw, CompanyRaw>;

  // other repositories
}
