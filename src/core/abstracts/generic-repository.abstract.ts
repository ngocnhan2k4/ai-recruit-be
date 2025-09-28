import { StatisticsJobFilter } from "../entities";

export interface IGenericRepository<T> {
  getAll(): Promise<T[]>;

  get(id: number): Promise<T | null>;

  getByField(field: Partial<T>): Promise<T | null>;

  create(item: Omit<T, "id">): Promise<T>;

  update(id: number, item: T): Promise<T | null>;
}

export interface IAuthGenericRepository<T> extends IGenericRepository<T> {
  revoke(token: string): Promise<void>;
  findValidToken(token: string): Promise<T | null>;
}

export interface IJobGenericRepository<TJob, TProvince, TCompany, TSkill>
  extends IGenericRepository<TJob> {
  getAllJobs(
    limit?: number,
    offset?: number,
    keyword?: string,
    sortBy?: string,
    sortDirection?: "asc" | "desc",
  ): Promise<
    { job: TJob; provinces: TProvince[]; company: TCompany; skills: TSkill[] }[]
  >;

  getFrequentlyJobs(
    filter: StatisticsJobFilter,
  ): Promise<{ date: string; count: number }[]>;

  count(filter: StatisticsJobFilter): Promise<number>;

  getSalaryStatisticsByExperience(filter: StatisticsJobFilter): Promise<
    {
      expYear: number;
      avgSalaryMin: number;
      avgSalaryMax: number;
      jobCount: number;
    }[]
  >;
}

//  eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ICategoryGenericRepository<TCategory>
  extends IGenericRepository<TCategory> {}
