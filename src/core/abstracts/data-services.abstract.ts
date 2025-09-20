import { User, RefreshToken } from "../entities";
import { IGenericRepository, IAuthGenericRepository } from "./generic-repository.abstract";

export abstract class IDataServices {
  abstract users: IGenericRepository<User>;
  abstract refreshTokens: IAuthGenericRepository<RefreshToken>;

  // other repositories...
}
