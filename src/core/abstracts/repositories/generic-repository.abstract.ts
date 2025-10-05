export abstract class IGenericRepository<T> {
  abstract getAll(): Promise<T[]>;

  abstract get(id: string | number): Promise<T | null>;

  abstract getByField(field: Partial<T>, omit?: (keyof T)[]): Promise<T[]>;

  abstract create(item: Partial<T>): Promise<T>;

  abstract update(where: Partial<T>, item: Partial<T>): Promise<T[]>;

  abstract delete(where: Partial<T>): Promise<T[]>;
}
