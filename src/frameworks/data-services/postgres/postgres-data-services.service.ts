import { Inject, Injectable } from "@nestjs/common";
import {
  IAuthGenericRepository,
  IDataServices,
  IJobGenericRepository,
} from "../../../core";
import {
  AuthPostgresGenericRepository,
  JobPostgresGenericRepository,
  PostgresGenericRepository,
} from "./postgres-generic-repository";
import { User, RefreshToken } from "../../../core/entities";
import { IGenericRepository } from "../../../core";
import { users, refreshTokens, jobRaws } from "./model";
import { JobRaw, CompanyRaw } from "@/core/index";

@Injectable()
export class PostgresDataServices implements IDataServices {
  users: IGenericRepository<User>;
  refreshTokens: IAuthGenericRepository<RefreshToken>;
  jobRaws: IJobGenericRepository<JobRaw, CompanyRaw>;

  constructor(@Inject("DRIZZLE") private db) {
    this.users = new PostgresGenericRepository<User, typeof users>(db, users);

    this.refreshTokens = new AuthPostgresGenericRepository<
      RefreshToken,
      typeof refreshTokens
    >(db, refreshTokens);

    this.jobRaws = new JobPostgresGenericRepository<
      JobRaw,
      CompanyRaw,
      typeof jobRaws
    >(db);
  }
}
