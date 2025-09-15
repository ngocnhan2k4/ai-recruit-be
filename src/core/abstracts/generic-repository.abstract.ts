export interface IGenericRepository<T> {
  getAll(): Promise<T[]>;

  //get(id: number): Promise<T>;

  //create(item: T): Promise<T>;

  //update(id: number, item: T): Promise<T>;
}
