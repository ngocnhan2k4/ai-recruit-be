import { IGenericRepository } from "./generic-repository.abstract";
import { Company, Skill, UserExperience } from "@/core/entities";

export abstract class IUserExperienceRepository extends IGenericRepository<UserExperience> {
  abstract getUserExperiencesByUsername(userName: string): Promise<
    {
      experience: Omit<
        UserExperience,
        "companyId" | "userId" | "createdAt" | "updatedAt" | "deletedAt"
      >;
      company: Pick<Company, "id" | "name" | "logoUrl" | "address"> | null;
      skills: Skill[];
    }[]
  >;
}
