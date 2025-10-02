import { IGenericRepository } from "./generic-repository.abstract";
import { User } from "@/core/entities";

export abstract class IUserRepository extends IGenericRepository<User> {}
