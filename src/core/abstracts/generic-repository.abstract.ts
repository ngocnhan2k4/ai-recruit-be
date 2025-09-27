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

export interface IJobGenericRepository<TJob, TCompany, TSkill>
  extends IGenericRepository<TJob> {
  getAllJobs(
    limit?: number,
    offset?: number,
    keyword?: string,
  ): Promise<{ job: TJob; company: TCompany; skills: TSkill[] }[]>;
}

//  eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ICategoryGenericRepository<TCategory>
  extends IGenericRepository<TCategory> {}
