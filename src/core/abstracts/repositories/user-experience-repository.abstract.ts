import { IGenericRepository } from "./generic-repository.abstract";
import { Company, Skill, UserExperience } from "@/core/entities";

export abstract class IUserExperienceRepository extends IGenericRepository<UserExperience> {
  abstract getUserExperiences(userName: string): Promise<
    {
      experience: UserExperience;
      company: Company;
      skill: Skill;
    }[]
  >;
}
