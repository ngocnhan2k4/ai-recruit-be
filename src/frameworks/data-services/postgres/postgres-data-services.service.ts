import { Inject, Injectable } from "@nestjs/common";
import {
  IAuthGenericRepository,
  ICategoryGenericRepository,
  IDataServices,
  IJobGenericRepository,
  IGenericRepository,
} from "../../../core";
import {
  AuthPostgresGenericRepository,
  CategoryPostgresGenericRepository,
  JobPostgresGenericRepository,
  PostgresGenericRepository,
} from "./postgres-generic-repository";
import { users, refreshTokens, jobs, categories } from "./model";
import {
  Job,
  Company,
  User,
  RefreshToken,
  Skill,
  Province,
  Category,
} from "@/core";
import { type DBDrizzle } from "./helpers";

@Injectable()
export class PostgresDataServices implements IDataServices {
  users: IGenericRepository<User>;
  refreshTokens: IAuthGenericRepository<RefreshToken>;
  jobs: IJobGenericRepository<Job, Province, Company, Skill>;
  categories: ICategoryGenericRepository<Category>;

  constructor(@Inject("DRIZZLE") private db: DBDrizzle) {
    this.users = new PostgresGenericRepository<User, typeof users>(db, users);

    this.refreshTokens = new AuthPostgresGenericRepository<
      RefreshToken,
      typeof refreshTokens
    >(db, refreshTokens);

    this.jobs = new JobPostgresGenericRepository<
      Job,
      Province,
      Company,
      Skill,
      typeof jobs
    >(db);

    this.categories = new CategoryPostgresGenericRepository<
      Category,
      typeof categories
    >(db);
  }
}
