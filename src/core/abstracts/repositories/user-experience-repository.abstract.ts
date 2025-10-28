import { CreateUserExperience } from "@/core/entities/user.entity";
import { IGenericRepository } from "./generic-repository.abstract";
import {
  OrganizationWithDetails,
  Skill,
  UserExperience,
} from "@/core/entities";

export abstract class IUserExperienceRepository extends IGenericRepository<UserExperience> {
  abstract getUserExperiencesByUsername(userName: string): Promise<
    {
      experience: Omit<
        UserExperience,
        "organizationId" | "userId" | "createdAt" | "updatedAt" | "deletedAt"
      >;
      organization: Pick<
        OrganizationWithDetails,
        "id" | "name" | "address" | "logoUrl"
      >;
      skills: Skill[];
    }[]
  >;

  abstract createUserExperienceWithCompanyAndSkills(
    userId: string,
    data: CreateUserExperience,
  ): Promise<UserExperience>;

  abstract updateUserExperienceWithCompanyAndSkills(
    userId: string,
    id: number,
    data: CreateUserExperience,
  ): Promise<UserExperience | null>;
}
