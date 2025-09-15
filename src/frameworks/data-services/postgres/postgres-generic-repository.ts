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
}
