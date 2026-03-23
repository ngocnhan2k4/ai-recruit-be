import { eq, and, isNull, inArray } from "drizzle-orm";
import { IGenericRepository } from "@/core";
import { Inject } from "@nestjs/common";
import {
  DBDrizzleTransaction,
  type DBDrizzle,
} from "@/frameworks/data-services/postgres/types";
import { ID } from "@/common/types";

export class GenericRepository<T, TTable extends object>
  implements IGenericRepository<T>
{
  protected _table: TTable;
  constructor(
    @Inject("DRIZZLE") protected db: DBDrizzle,
    table: TTable,
  ) {
    this._table = table;
  }

  async getAll<K extends keyof T>(fields: K[]): Promise<Pick<T, K>[]> {
    return (await this.db
      .select(
        Object.fromEntries(
          fields.map((field) => [field, (this._table as any)[field as string]]),
        ),
      )
      .from(this._table as any)) as Pick<T, K>[];
  }

  async get(id: ID): Promise<T | null> {
    const result = await this.db
      .select()
      .from(this._table as any)
      .where(eq((this._table as any).id, id));
    return (result[0] as T) || null;
  }

  async getByIds(ids: ID[], fields: (keyof T)[]): Promise<T[]> {
    if (ids.length === 0) return [];

    const table: any = this._table;

    const selectFields = fields.reduce((acc: any, field) => {
      acc[field] = table[field];
      return acc;
    }, {});

    const result = await this.db
      .select(selectFields)
      .from(table)
      .where(inArray(table.id, ids));
    return result as T[];
  }

  async getByField(field: Partial<T>, omit: (keyof T)[] = []): Promise<T[]> {
    const keys = Object.keys(field) as (keyof T)[];
    if (keys.length === 0) {
      return [];
    }
    const conditions = keys.map((key) => {
      const value = field[key];
      // Use isNull() for null values to generate proper "IS NULL" SQL
      if (value === null) {
        return isNull((this._table as any)[key as string]);
      }
      return eq((this._table as any)[key as string], value);
    });

    const allColumns = Object.keys(this._table) as (keyof T)[];
    const selectedColumns = allColumns.filter((c) => !omit.includes(c));

    const result = await this.db
      .select({
        ...(selectedColumns as string[]).reduce(
          (acc, col) => ({ ...acc, [col]: (this._table as any)[col] }),
          {},
        ),
      })
      .from(this._table as any)
      .where(and(...conditions));
    return result as T[];
  }

  async create(item: Partial<T>, tx?: DBDrizzleTransaction): Promise<T> {
    const dbClient = tx ?? this.db;
    const result = await dbClient
      .insert(this._table as any)
      .values(
        item as {
          [key: string]: any;
        },
      )
      .returning();
    return result[0] as T;
  }

  async createMany(
    item: Partial<T>[],
    tx?: DBDrizzleTransaction,
  ): Promise<T[]> {
    const dbClient = tx ?? this.db;
    const result = await dbClient
      .insert(this._table as any)
      .values(
        item as {
          [key: string]: any;
        },
      )
      .returning();
    return result as T[];
  }

  async update(
    where: Partial<T>,
    item: Partial<T>,
    tx?: DBDrizzleTransaction,
  ): Promise<T[]> {
    const conditions = Object.entries(where).map(([key, value]) =>
      eq((this._table as any)[key], value),
    );

    const dbClient = tx ?? this.db;

    const cleanItem = Object.fromEntries(
      Object.entries(item).filter(([_, v]) => v !== undefined),
    );

    const result = await dbClient
      .update(this._table as any)
      .set(
        cleanItem as {
          [key: string]: any;
        },
      )
      .where(and(...conditions))
      .returning();
    return result;
  }

  async delete(where: Partial<T>, tx?: DBDrizzleTransaction): Promise<T[]> {
    const conditions = Object.entries(where).map(([key, value]) =>
      eq((this._table as any)[key], value),
    );

    const dbClient = tx ?? this.db;

    const result = await dbClient
      .update(this._table as any)
      .set({ deletedAt: new Date() })
      .where(and(...conditions))
      .returning();
    return result as T[];
  }

  async deletePermanently(
    where: Partial<T>,
    tx?: DBDrizzleTransaction,
  ): Promise<T[]> {
    const conditions = Object.entries(where).map(([key, value]) =>
      eq((this._table as any)[key], value),
    );

    const dbClient = tx ?? this.db;

    const result = await dbClient
      .delete(this._table as any)
      .where(and(...conditions))
      .returning();
    return result as T[];
  }

  async executeWithTransaction<T>(
    fn: (tx: DBDrizzleTransaction) => Promise<T>,
  ): Promise<T> {
    return await this.db.transaction(async (tx) => fn(tx));
  }
}
