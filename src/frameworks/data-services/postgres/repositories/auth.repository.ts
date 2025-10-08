import { IAuthRepository, RefreshToken } from "@/core";
import { GenericRepository } from "./generic-repository";
import { and, eq, gt } from "drizzle-orm";
import { refreshTokens } from "../models";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "@/frameworks/data-services/postgres/types";

@Injectable()
export class AuthRepository
  extends GenericRepository<RefreshToken, typeof refreshTokens>
  implements IAuthRepository
{
  constructor(@Inject("DRIZZLE") db: DBDrizzle) {
    super(db, refreshTokens);
  }
  async revoke(token: string): Promise<void> {
    await this.db
      .update(this._table as any)
      .set({ revoked: true })
      .where(eq((this._table as any).token, token))
      .execute();
  }
  async findValidToken(token: string): Promise<RefreshToken | null> {
    const result = await this.db
      .select()
      .from(this._table as any)
      .where(
        and(
          eq((this._table as any).token, token),
          eq((this._table as any).revoked, false),
          gt((this._table as any).expiresAt, new Date()),
        ),
      );
    return (result[0] as RefreshToken) || null;
  }
}
