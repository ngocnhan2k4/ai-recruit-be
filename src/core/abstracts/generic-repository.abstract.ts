export interface IGenericRepository<T> {
  getAll(): Promise<T[]>;

  get(id: number): Promise<T | null>;

  getByField(field: Partial<T>): Promise<T | null>;

  create(item: T): Promise<T | null>;

  update(id: number, item: T): Promise<T | null>;
}
