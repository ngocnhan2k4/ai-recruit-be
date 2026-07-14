import { IGenericRepository } from "./generic-repository.abstract";
import { RefreshToken } from "@/core/entities";

export abstract class IAuthRepository extends IGenericRepository<RefreshToken> {
  abstract revoke(token: string): Promise<void>;
  abstract revokeAllForUser(userId: string): Promise<void>;
  abstract findValidToken(token: string): Promise<RefreshToken | null>;
  /**
   * Shorten a token's lifetime to at most `graceUntil` (only if it currently
   * lives longer). Used on rotation so the old token stays valid for a short
   * grace window instead of being revoked immediately.
   */
  abstract retireWithGrace(token: string, graceUntil: Date): Promise<void>;
}
