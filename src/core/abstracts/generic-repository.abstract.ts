import { StatisticsJobFilter } from "../entities";
import { UpdateUserExperienceDto } from "@/interfaces/dtos";

export interface IGenericRepository<T> {
  getAll(): Promise<T[]>;

  get(id: number | string): Promise<T | null>;

  getByField(field: Partial<T>): Promise<T | null>;

  create(
    item: Omit<T, "id" | "createdAt" | "updatedAt" | "deletedAt">,
  ): Promise<T>;

  update(id: number | string, item: Partial<T>): Promise<T | null>;

  delete(id: number | string): Promise<T | null>;
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

export interface IUserExperienceGenericRepository<TUserExperience>
  extends IGenericRepository<TUserExperience> {
  getByUserId(userId: number): Promise<TUserExperience[]>;
  updateUserExperience(
    userId: number,
    id: string,
    item: UpdateUserExperienceDto,
  ): Promise<TUserExperience | null>;
  deleteUserExperience(
    userId: number,
    id: string,
  ): Promise<TUserExperience | null>;
}

export interface IUserSkillGenericRepository<TUserSkill>
  extends IGenericRepository<TUserSkill> {
  getByUserId(userId: number): Promise<TUserSkill[]>;
  createUserSkill(userId: number, skillId: string): Promise<TUserSkill>;
  deleteUserSkill(userId: number, skillId: string): Promise<TUserSkill | null>;
  updateUserSkill(userId: number, skillId: string): Promise<TUserSkill | null>;
}
