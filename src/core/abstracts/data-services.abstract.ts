import {
  User,
  RefreshToken,
  Company,
  Category,
  Job,
  Skill,
  Province,
  UserExperience,
  UserSkill,
} from "../entities";
import {
  IAuthGenericRepository,
  IJobGenericRepository,
  ICategoryGenericRepository,
  IUserGenericRepository,
  IUserExperienceGenericRepository,
  IUserSkillGenericRepository,
  IProvinceGenericRepository,
} from "./generic-repository.abstract";

export abstract class IDataServices {
  abstract users: IUserGenericRepository<User>;
  abstract refreshTokens: IAuthGenericRepository<RefreshToken>;
  abstract jobs: IJobGenericRepository<Job, Province, Company, Skill>;
  abstract categories: ICategoryGenericRepository<Category>;
  abstract userExperiences: IUserExperienceGenericRepository<UserExperience>;
  abstract userSkills: IUserSkillGenericRepository<UserSkill>;
  abstract provinces: IProvinceGenericRepository<Province>;
  // other repositories
}
