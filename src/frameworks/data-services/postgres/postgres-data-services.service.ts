import { Inject, Injectable } from "@nestjs/common";
import {
  IAuthGenericRepository,
  ICategoryGenericRepository,
  IDataServices,
  IJobGenericRepository,
  IGenericRepository,
  IUserExperienceGenericRepository,
  IUserSkillGenericRepository,
  IProvinceGenericRepository,
} from "../../../core";
import { PostgresGenericRepository } from "./repositories/postgres-generic-repository";
import {
  users,
  refreshTokens,
  jobs,
  categories,
  userSkills,
  userExperiences,
  provinces,
} from "./models";
import {
  Job,
  Company,
  User,
  RefreshToken,
  Skill,
  Province,
  Category,
  UserExperience,
  UserSkill,
} from "@/core";
import { type DBDrizzle } from "./types";
import { AuthPostgresGenericRepository } from "./repositories/auth-postgres.repository";
import { JobPostgresRepository } from "./repositories/job-postgres.repository";
import { CategoryPostgresRepository } from "./repositories/category-postgres.repository";
import { UserExperiencePostgresRepository } from "./repositories/user-experience-postgres.repository";
import { UserSkillPostgresRepository } from "./repositories/user-skill-postgres.repository";
import { ProvincePostgresGenericRepository } from "./repositories/province-postgres.repository";

@Injectable()
export class PostgresDataServices implements IDataServices {
  users: IGenericRepository<User>;
  refreshTokens: IAuthGenericRepository<RefreshToken>;
  jobs: IJobGenericRepository<Job, Province, Company, Skill>;
  categories: ICategoryGenericRepository<Category>;
  userExperiences: IUserExperienceGenericRepository<UserExperience>;
  userSkills: IUserSkillGenericRepository<UserSkill>;
  provinces: IProvinceGenericRepository<Province>;

  constructor(@Inject("DRIZZLE") private db: DBDrizzle) {
    this.users = new PostgresGenericRepository<User, typeof users>(db, users);

    this.refreshTokens = new AuthPostgresGenericRepository<
      RefreshToken,
      typeof refreshTokens
    >(db, refreshTokens);

    this.jobs = new JobPostgresRepository<
      Job,
      Province,
      Company,
      Skill,
      typeof jobs
    >(db);

    this.categories = new CategoryPostgresRepository<
      Category,
      typeof categories
    >(db);

    this.userExperiences = new UserExperiencePostgresRepository<
      UserExperience,
      typeof userExperiences
    >(db);

    this.userSkills = new UserSkillPostgresRepository<
      UserSkill,
      typeof userSkills
    >(db);

    this.provinces = new ProvincePostgresGenericRepository<
      Province,
      typeof provinces
    >(db);
  }
}
