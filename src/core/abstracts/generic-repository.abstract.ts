export interface IGenericRepository<T> {
  getAll(): Promise<T[]>;

  get(id: number): Promise<T | null>;

  getByField(field: Partial<T>): Promise<T | null>;

  create(item: T): Promise<T>;

  update(id: number, item: T): Promise<T | null>;
}

export interface IAuthGenericRepository<T> extends IGenericRepository<T> {
  revoke(token: string): Promise<void>;
  findValidToken(token: string): Promise<T | null>;
}
