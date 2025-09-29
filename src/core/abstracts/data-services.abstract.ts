import {
  User,
  RefreshToken,
  Company,
  Category,
  Job,
  UserExperience,
  UserSkill,
} from "../entities";
import {
  IAuthGenericRepository,
  IJobGenericRepository,
  ICategoryGenericRepository,
  IGenericRepository,
  IUserExperienceGenericRepository,
  IUserSkillGenericRepository,
} from "./generic-repository.abstract";

export abstract class IDataServices {
  abstract users: IGenericRepository<User>;
  abstract refreshTokens: IAuthGenericRepository<RefreshToken>;
  abstract jobs: IJobGenericRepository<Job, Company, string>;
  abstract categories: ICategoryGenericRepository<Category>;
  abstract userExperiences: IUserExperienceGenericRepository<UserExperience>;
  abstract userSkills: IUserSkillGenericRepository<UserSkill>;
  // other repositories
}
