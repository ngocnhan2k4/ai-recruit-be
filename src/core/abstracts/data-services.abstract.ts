import {
  User,
  RefreshToken,
  Company,
  Category,
  Job,
  Skill,
  Province,
} from "../entities";
import { UserExperience, UserSkill } from "../entities/user.entity";
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
  abstract jobs: IJobGenericRepository<Job, Province, Company, Skill>;
  abstract categories: ICategoryGenericRepository<Category>;
  abstract userExperiences: IUserExperienceGenericRepository<UserExperience>;
  abstract userSkills: IUserSkillGenericRepository<UserSkill>;
  // other repositories
}
