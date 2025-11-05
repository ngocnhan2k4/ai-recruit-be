import { DBDrizzleTransaction } from "@/frameworks/data-services/postgres/types";

export abstract class ITransactionManager {
  abstract execute<T>(fn: (tx: DBDrizzleTransaction) => Promise<T>): Promise<T>;
}
