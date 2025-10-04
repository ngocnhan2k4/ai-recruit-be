import { IGenericRepository } from "./generic-repository.abstract";
import { Company, UserExperience } from "@/core/entities";

export abstract class IUserExperienceRepository extends IGenericRepository<UserExperience> {
  abstract getByUserId(userId: string): Promise<
    (Omit<
      UserExperience,
      "companyId" | "userId" | "createdAt" | "updatedAt" | "deletedAt"
    > & {
      company: Pick<Company, "id" | "name" | "logoUrl" | "address">;
    })[]
  >;
}
