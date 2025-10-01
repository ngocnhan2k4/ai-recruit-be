import { Inject, Injectable } from "@nestjs/common";
import {
  IAuthGenericRepository,
  ICategoryGenericRepository,
  IProvinceGenericRepository,
  IDataServices,
  IJobGenericRepository,
} from "../../../core";
import {
  AuthPostgresGenericRepository,
  CategoryPostgresGenericRepository,
  ProvincePostgresGenericRepository,
  JobPostgresGenericRepository,
  PostgresGenericRepository,
} from "./postgres-generic-repository";
import { User, RefreshToken, Skill } from "../../../core/entities";
import { IGenericRepository } from "../../../core";
import { users, refreshTokens, jobs, categories, provinces } from "./model";
import { Job, Company } from "@/core/index";
import { type DBDrizzle } from "./helpers";
import { Category } from "@/core/entities/category.entity";
import { Province } from "@/core/entities/province.entity";

@Injectable()
export class PostgresDataServices implements IDataServices {
  users: IGenericRepository<User>;
  refreshTokens: IAuthGenericRepository<RefreshToken>;
  jobs: IJobGenericRepository<Job, Province, Company, Skill>;
  categories: ICategoryGenericRepository<Category>;
  provinces: IProvinceGenericRepository<Province>;

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

    this.provinces = new ProvincePostgresGenericRepository<
      Province,
      typeof provinces
    >(db);
  }
}
