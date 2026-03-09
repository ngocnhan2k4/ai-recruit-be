import { IGenericRepository } from "./generic-repository.abstract";
import {
  NewUser,
  User,
  UserTrends,
  UserTrendsQuery,
  GetUserQuery,
  UserProfile,
  UserCvData,
} from "@/core/entities";
import { PaginatedResult } from "@/common/types";

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
        | "roles"
        | "status"
        | "createdAt"
        | "updatedAt"
        | "deletedAt"
      >
    >
  >;

  abstract createUser(user: NewUser): Promise<User>;
  abstract adminUpdateUser(userId: string, user: Partial<User>): Promise<User>;

  abstract getAllAdminUsers(
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
        | "roles"
        | "status"
        | "createdAt"
        | "updatedAt"
        | "deletedAt"
      >
    >
  >;

  abstract getUserProfile(userId: string): Promise<UserProfile | null>;
  abstract getUserCvData(userId: string): Promise<UserCvData | null>;
  abstract getUserTrends(params: UserTrendsQuery): Promise<UserTrends[]>;
}
