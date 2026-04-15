import { IGenericRepository } from "./generic-repository.abstract";
import {
  NewUser,
  User,
  UserTrends,
  UserTrendsQuery,
  GetUserQuery,
  UserProfile,
  UserCvData,
  NewUserIdentity,
  GetAllUserResponse,
} from "@/core/entities";
import { ProviderEnum } from "@/core/entities/enum.entity";
import { PaginatedResult } from "@/common/types";
import { DBDrizzleTransaction } from "@/frameworks/data-services/postgres/types";

export abstract class IUserRepository extends IGenericRepository<User> {
  abstract getAllWithOffset(
    query: GetUserQuery,
  ): Promise<PaginatedResult<GetAllUserResponse>>;

  abstract createUser(user: NewUser, tx: DBDrizzleTransaction): Promise<User>;

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

  abstract addUserIdentity(
    identity: NewUserIdentity,
    tx?: DBDrizzleTransaction,
  ): Promise<void>;

  abstract getUserLoginMethods(userId: string): Promise<
    {
      provider: string;
      createdAt: Date;
      providerUserId?: string | null;
      providerEmail?: string | null;
      providerName?: string | null;
      providerPicture?: string | null;
    }[]
  >;

  abstract getActiveUserIdentityId(
    userId: string,
    provider: ProviderEnum,
    tx?: DBDrizzleTransaction,
  ): Promise<string | null>;

  abstract softDeleteUserIdentity(
    userId: string,
    provider: ProviderEnum,
    deletedAt?: Date,
    tx?: DBDrizzleTransaction,
  ): Promise<number>;
}
