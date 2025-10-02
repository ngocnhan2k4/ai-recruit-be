import { IGenericRepository } from "./generic-repository.abstract";
import { UserExperience } from "@/core/entities";

export abstract class IUserExperienceRepository extends IGenericRepository<UserExperience> {}
