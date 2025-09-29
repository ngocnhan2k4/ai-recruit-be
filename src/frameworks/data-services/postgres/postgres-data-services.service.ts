import { Inject, Injectable } from "@nestjs/common";
import {
  IAuthGenericRepository,
  ICategoryGenericRepository,
  IDataServices,
  IJobGenericRepository,
  IUserExperienceGenericRepository,
  IUserSkillGenericRepository,
} from "../../../core";
import {
  AuthPostgresGenericRepository,
  CategoryPostgresGenericRepository,
  JobPostgresGenericRepository,
  PostgresGenericRepository,
  UserExperiencePostgresGenericRepository,
  UserSkillPostgresGenericRepository,
} from "./postgres-generic-repository";
import { User, RefreshToken, UserExperience, UserSkill } from "../../../core/entities";
import { IGenericRepository } from "../../../core";
import { users, refreshTokens, jobs, categories, userExperiences, userSkills } from "./model";
import { Job, Company } from "@/core/index";
import { type DBDrizzle } from "./helpers";
import { Category } from "@/core/entities/category.entity";

@Injectable()
export class PostgresDataServices implements IDataServices {
  users: IGenericRepository<User>;
  refreshTokens: IAuthGenericRepository<RefreshToken>;
  jobs: IJobGenericRepository<Job, Company, string>;
  categories: ICategoryGenericRepository<Category>;
  userExperiences: IUserExperienceGenericRepository<UserExperience>;
  userSkills: IUserSkillGenericRepository<UserSkill>;
  constructor(@Inject("DRIZZLE") private db: DBDrizzle) {
    this.users = new PostgresGenericRepository<User, typeof users>(db, users);

    this.refreshTokens = new AuthPostgresGenericRepository<
      RefreshToken,
      typeof refreshTokens
    >(db, refreshTokens);

    this.jobs = new JobPostgresGenericRepository<
      Job,
      Company,
      string,
      typeof jobs
    >(db);

    this.categories = new CategoryPostgresGenericRepository<
      Category,
      typeof categories
    >(db);

    this.userExperiences = new UserExperiencePostgresGenericRepository<
      UserExperience,
      typeof userExperiences
    >(db);

    this.userSkills = new UserSkillPostgresGenericRepository<
      UserSkill,
      typeof userSkills
    >(db);

  }
}
