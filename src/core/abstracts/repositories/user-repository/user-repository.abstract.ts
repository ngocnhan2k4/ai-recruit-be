import { IGenericRepository } from "../generic-repository.abstract";
import { User } from "@/core/entities";

//  eslint-disable-next-line @typescript-eslint/no-empty-object-type
export abstract class IUserRepository extends IGenericRepository<User> {}
