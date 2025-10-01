import { Inject, Injectable } from "@nestjs/common";
import {
  IAuthGenericRepository,
  ICategoryGenericRepository,
  IDataServices,
  IJobGenericRepository,
  IGenericRepository,
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
import {
  users,
  refreshTokens,
  jobs,
  categories,
  userSkills,
  userExperiences,
} from "./model";
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
import { UserExperience, UserSkill } from "@/core/entities/user.entity";

@Injectable()
export class PostgresDataServices implements IDataServices {
  users: IGenericRepository<User>;
  refreshTokens: IAuthGenericRepository<RefreshToken>;
  jobs: IJobGenericRepository<Job, Province, Company, Skill>;
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
      Province,
      Company,
      Skill,
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
