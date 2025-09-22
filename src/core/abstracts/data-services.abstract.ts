import { User } from "../entities/user.entity";
import { IGenericRepository } from "./generic-repository.abstract";
import { PostgresJobRawRepository } from "./job-repository.abstract";

export abstract class IDataServices {
  abstract users: IGenericRepository<User>;

  abstract jobs: PostgresJobRawRepository;

  // other repositories
}
