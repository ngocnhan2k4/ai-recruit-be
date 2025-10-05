import { IGenericRepository } from "./generic-repository.abstract";
import { Cv } from "@/core/entities";

export abstract class ICvRepository extends IGenericRepository<Cv> {
  abstract getByUserId(userId: string): Promise<Cv[]>;
  abstract getById(cvId: string): Promise<Cv | null>;
  abstract updateCv(cvId: string, cv: Partial<Cv>): Promise<Cv | null>;
  abstract deleteCv(cvId: string): Promise<boolean>;
  abstract updateLastUsed(cvId: string): Promise<void>;
}
