import { UserEducation } from "@/core/entities";
import { IGenericRepository } from "./generic-repository.abstract";

export abstract class IUserEducationRepository extends IGenericRepository<UserEducation> {
  abstract getUserEducationsByUserId(
    userId: string,
    requestLanguage?: string,
    fallbackLanguage?: string,
  ): Promise<UserEducation[]>;
}
