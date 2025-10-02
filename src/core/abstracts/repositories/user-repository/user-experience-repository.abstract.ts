import { IGenericRepository } from "../generic-repository.abstract";
import { UserExperience } from "@/core/entities";

//  eslint-disable-next-line @typescript-eslint/no-empty-object-type
export abstract class IUserExperienceRepository extends IGenericRepository<UserExperience> {}
