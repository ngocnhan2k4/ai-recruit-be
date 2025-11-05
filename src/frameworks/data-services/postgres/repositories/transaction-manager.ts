import { ITransactionManager } from "@/core";
import { Inject, Injectable } from "@nestjs/common";
import { DBDrizzleTransaction, type DBDrizzle } from "../types";

@Injectable()
export class TransactionManager implements ITransactionManager {
  constructor(@Inject("DRIZZLE") private readonly db: DBDrizzle) {}

  async execute<T>(fn: (tx: DBDrizzleTransaction) => Promise<T>): Promise<T> {
    return await this.db.transaction(async (tx) => fn(tx));
  }
}
