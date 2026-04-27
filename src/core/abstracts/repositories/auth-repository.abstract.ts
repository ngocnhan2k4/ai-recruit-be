import { IGenericRepository } from "./generic-repository.abstract";
import { RefreshToken } from "@/core/entities";

export abstract class IAuthRepository extends IGenericRepository<RefreshToken> {
  abstract revoke(token: string): Promise<void>;
  abstract revokeAllForUser(userId: string): Promise<void>;
  abstract findValidToken(token: string): Promise<RefreshToken | null>;
}
