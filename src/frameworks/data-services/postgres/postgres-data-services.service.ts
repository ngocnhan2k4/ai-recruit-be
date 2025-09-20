import { Injectable } from "@nestjs/common";
import { IAuthGenericRepository, IDataServices } from "../../../core";
import { AuthPostgresGenericRepository, PostgresGenericRepository } from "./postgres-generic-repository";
import { User, RefreshToken } from "../../../core/entities";
import { IGenericRepository } from "../../../core";
import { users, refreshTokens } from "./model";

@Injectable()
export class PostgresDataServices implements IDataServices {
  users: IGenericRepository<User>;
  refreshTokens: IAuthGenericRepository<RefreshToken>;
  constructor() {
    this.users = new PostgresGenericRepository<User, typeof users>(users);
    this.refreshTokens = new AuthPostgresGenericRepository<RefreshToken, typeof refreshTokens>(refreshTokens);
  }
}
