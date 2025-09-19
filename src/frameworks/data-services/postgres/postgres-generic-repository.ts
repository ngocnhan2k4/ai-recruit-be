import { eq, and } from "drizzle-orm";
import { IGenericRepository } from "../../../core";
import { db } from "./db";

export class PostgresGenericRepository<T, TTable>
  implements IGenericRepository<T>
{
  private _table: TTable;
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

  async create(item: T): Promise<T | null> {
    const result = await db
      .insert(this._table as any)
      .values(item as any)
      .returning();
    return (result[0] as T) || null;
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
