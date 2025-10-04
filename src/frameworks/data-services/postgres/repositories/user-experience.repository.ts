import { IUserExperienceRepository } from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { companies, userExperiences } from "../models";
import { Company, UserExperience } from "@/core/entities";
import { eq } from "drizzle-orm";

@Injectable()
export class UserExperienceRepository
  extends GenericRepository<UserExperience, typeof userExperiences>
  implements IUserExperienceRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, userExperiences);
  }

  async getByUserId(userId: string): Promise<
    (Omit<
      UserExperience,
      "companyId" | "userId" | "createdAt" | "updatedAt" | "deletedAt"
    > & {
      company: Pick<Company, "id" | "name" | "logoUrl" | "address">;
    })[]
  > {
    const result = await this.db
      .select({
        id: userExperiences.id,
        jobTitle: userExperiences.jobTitle,
        position: userExperiences.position,
        startDate: userExperiences.startDate,
        endDate: userExperiences.endDate,
        description: userExperiences.description,
        company: {
          id: companies.id,
          name: companies.name,
          logoUrl: companies.logoUrl,
          address: companies.address,
        },
      })
      .from(userExperiences)
      .leftJoin(companies, eq(userExperiences.companyId, companies.id))
      .where(eq(userExperiences.userId, userId));
    return result as (Omit<
      UserExperience,
      "companyId" | "userId" | "createdAt" | "updatedAt" | "deletedAt"
    > & {
      company: Pick<Company, "id" | "name" | "logoUrl" | "address">;
    })[];
  }
}
