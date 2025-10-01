import { StatisticsJobFilter } from "../entities";

export interface IGenericRepository<T> {
  getAll(): Promise<T[]>;

  get(id: string | number): Promise<T | null>;

  getByField(field: Partial<T>): Promise<T[]>;

  create(item: Partial<T>): Promise<T>;

  update(where: Partial<T>, item: Partial<T>): Promise<T[]>;

  delete(where: Partial<T>): Promise<T[]>;
}

//  eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IUserGenericRepository<T> extends IGenericRepository<T> {}

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

//  eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IUserExperienceGenericRepository<TUserExperience>
  extends IGenericRepository<TUserExperience> {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IUserSkillGenericRepository<TUserSkill>
  extends IGenericRepository<TUserSkill> {}

//  eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IProvinceGenericRepository<TProvince>
  extends IGenericRepository<TProvince> {}
