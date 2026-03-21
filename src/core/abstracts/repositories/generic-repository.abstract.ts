import { DBDrizzleTransaction } from "@/frameworks/data-services/postgres/types";
import { ID } from "@/common/types";
export abstract class IGenericRepository<T> {
  abstract getAll<K extends keyof T>(fields: K[]): Promise<Pick<T, K>[]>;

  abstract get(id: ID): Promise<T | null>;

  abstract getByIds(ids: ID[], fields: (keyof T)[]): Promise<T[]>;

  abstract getByField(field: Partial<T>, omit?: (keyof T)[]): Promise<T[]>;

  abstract create(item: Partial<T>, tx?: DBDrizzleTransaction): Promise<T>;

  abstract update(
    where: Partial<T>,
    item: Partial<T>,
    tx?: DBDrizzleTransaction,
  ): Promise<T[]>;

  abstract delete(where: Partial<T>, tx?: DBDrizzleTransaction): Promise<T[]>;

  abstract deletePermanently(
    where: Partial<T>,
    tx?: DBDrizzleTransaction,
  ): Promise<T[]>;

  abstract executeWithTransaction<T>(
    fn: (tx: DBDrizzleTransaction) => Promise<T>,
  ): Promise<T>;
}
