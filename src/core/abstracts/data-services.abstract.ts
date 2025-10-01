import { Province } from "../entities/province.entity";
import {
  User,
  RefreshToken,
  Company,
  Category,
  Job,
  UserExperience,
  UserSkill,
  Skill,
} from "../entities";
import {
  IAuthGenericRepository,
  IJobGenericRepository,
  ICategoryGenericRepository,
  IProvinceGenericRepository,
  IGenericRepository,
  IUserExperienceGenericRepository,
  IUserSkillGenericRepository,
} from "./generic-repository.abstract";

export abstract class IDataServices {
  abstract users: IGenericRepository<User>;
  abstract refreshTokens: IAuthGenericRepository<RefreshToken>;
  abstract jobs: IJobGenericRepository<Job, Province, Company, Skill>;
  abstract categories: ICategoryGenericRepository<Category>;
  abstract provinces: IProvinceGenericRepository<Province>;

  abstract userExperiences: IUserExperienceGenericRepository<UserExperience>;
  abstract userSkills: IUserSkillGenericRepository<UserSkill>;
  // other repositories
}
