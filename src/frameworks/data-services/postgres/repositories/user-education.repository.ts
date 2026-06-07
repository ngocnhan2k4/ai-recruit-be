import { GenericRepository } from "./generic-repository";
import { UserEducation } from "@/core/entities";
import { userEducations } from "../models";
import { type DBDrizzle } from "../types";
import { Inject, Injectable } from "@nestjs/common";
import { IUserEducationRepository } from "@/core/abstracts/repositories/user-education-repository.abstract";
import { eq } from "drizzle-orm";
import { resolveLanguageContext } from "@/common/utils";

@Injectable()
export class UserEducationRepository
  extends GenericRepository<UserEducation, typeof userEducations>
  implements IUserEducationRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, userEducations);
  }

  async getUserEducationsByUserId(
    userId: string,
    requestLanguage?: string,
    fallbackLanguage?: string,
  ): Promise<UserEducation[]> {
    const resolvedLanguages = resolveLanguageContext({
      requestLanguage,
      fallbackLanguage,
    });

    const getRowsByLanguage = async (languageCode: string) =>
      this.getByField({
        userId,
        languageCode,
      });

    let rows = await getRowsByLanguage(resolvedLanguages.requestLanguage);
    if (
      !rows.length &&
      resolvedLanguages.requestLanguage !== resolvedLanguages.fallbackLanguage
    ) {
      rows = await getRowsByLanguage(resolvedLanguages.fallbackLanguage);
    }

    if (!rows.length) {
      rows = await this.db
        .select()
        .from(userEducations)
        .where(eq(userEducations.userId, userId));
    }

    return rows;
  }
}
