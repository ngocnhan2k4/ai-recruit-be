import { eq, and } from "drizzle-orm";
import { IGenericRepository } from "@/core";
import { Inject } from "@nestjs/common";
import { type DBDrizzle } from "@/frameworks/data-services/postgres/types";

export class PostgresGenericRepository<T, TTable>
  implements IGenericRepository<T>
{
  protected _table: TTable;
  constructor(
    @Inject("DRIZZLE") protected db: DBDrizzle,
    table: TTable,
  ) {
    this._table = table;
  }

  async getAll(): Promise<T[]> {
    return (await this.db.select().from(this._table as any)) as T[];
  }

  async get(id: string | number): Promise<T | null> {
    const result = await this.db
      .select()
      .from(this._table as any)
      .where(eq((this._table as any).id, id));
    return (result[0] as T) || null;
  }

  async getByField(field: Partial<T>): Promise<T[]> {
    const keys = Object.keys(field) as (keyof T)[];
    if (keys.length === 0) {
      return [];
    }
    const conditions = keys.map((key) =>
      eq((this._table as any)[key as string], field[key]),
    );
    const result = await this.db
      .select()
      .from(this._table as any)
      .where(and(...conditions));
    return result as T[];
  }

  async create(item: Partial<T>): Promise<T> {
    const result = await this.db
      .insert(this._table as any)
      .values(
        item as {
          [key: string]: any;
        },
      )
      .returning();
    return result[0] as T;
  }

  async update(where: Partial<T>, item: Partial<T>): Promise<T[]> {
    const conditions = Object.entries(where).map(([key, value]) =>
      eq((this._table as any)[key], value),
    );

    const result = await this.db
      .update(this._table as any)
      .set(
        item as {
          [key: string]: any;
        },
      )
      .where(and(...conditions))
      .returning();
    return result;
  }

  async delete(where: Partial<T>): Promise<T[]> {
    const conditions = Object.entries(where).map(([key, value]) =>
      eq((this._table as any)[key], value),
    );

    const result = await this.db
      .delete(this._table as any)
      .where(and(...conditions))
      .returning();
    return result as T[];
  }
}
