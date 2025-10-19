import { GetUserQuery } from "@/core/entities/user.entity";
import { IGenericRepository } from "./generic-repository.abstract";
import { User } from "@/core/entities";
import { PaginatedResult } from "@/common/types/api";

export abstract class IUserRepository extends IGenericRepository<User> {
  abstract getAllWithOffset(
    query: GetUserQuery,
  ): Promise<
    PaginatedResult<
      Pick<
        User,
        | "id"
        | "email"
        | "name"
        | "username"
        | "emailVerified"
        | "phone"
        | "phoneVerified"
        | "status"
        | "createdAt"
        | "updatedAt"
        | "deletedAt"
      >
    >
  >;
}
