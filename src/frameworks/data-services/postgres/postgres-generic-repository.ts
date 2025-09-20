import { eq, and, gt } from "drizzle-orm";
import { IGenericRepository, IAuthGenericRepository } from "../../../core";
import { db } from "./db";

export class PostgresGenericRepository<T, TTable>
  implements IGenericRepository<T>
{
  protected _table: TTable;
  constructor(table: TTable) {
    this._table = table;
  }

  async getAll(): Promise<T[]> {
    return (await db.select().from(this._table as any)) as T[];
  }
  async get(id: number): Promise<T | null> {
    const result = await db
      .select()
      .from(this._table as any)
      .where(eq((this._table as any).id, id));
    return (result[0] as T) || null;
  }
  async getByField(field: Partial<T>): Promise<T | null> {
    const keys = Object.keys(field) as (keyof T)[];
    if (keys.length === 0) {
      return null;
    }
    const conditions = keys.map((key) => eq((this._table as any)[key as string], field[key]!));
    let query = db.select().from(this._table as any).where(and(...conditions));
    
    const result = await query;
    return (result[0] as T) || null;
  }

  async create(item: T): Promise<T> {
    const result = await db
      .insert(this._table as any)
      .values(item as any)
      .returning();
    return (result[0] as T);
  }

  async update(id: number, item: T): Promise<T | null> {
    const result = await db
      .update(this._table as any)
      .set(item as any)
      .where(eq((this._table as any).id, id))
      .returning();
    return (result[0] as T) || null;
  }

}

export class AuthPostgresGenericRepository<T, TTable>
  extends PostgresGenericRepository<T, TTable>
  implements IAuthGenericRepository<T>
{
  async revoke(token: string): Promise<void> {
    await db
      .update(this._table as any)
      .set({ revoked: true})
      .where(eq((this._table as any).token, token))
      .execute();
  }

  async revokeAllForUser(userId: number): Promise<void> {
    await db
      .update(this._table as any)
      .set({ revoked: true })
      .where(and(eq((this._table as any).user_id, userId), eq((this._table as any).revoked, false)))
      .execute();
  }
  async findValidToken(token: string): Promise<T | null> {
    const result = await db
      .select()
      .from(this._table as any)
      .where(and(
        eq((this._table as any).token, token),
        eq((this._table as any).revoked, false),
        gt((this._table as any).expiresAt, new Date()))
      );
    return (result[0] as T) || null;
  }
}
