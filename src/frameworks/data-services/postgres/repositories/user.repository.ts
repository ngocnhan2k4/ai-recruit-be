import { CACHE_KEYS, RoleEnum, SHORT_TTL } from "@/common/constants";
import { PaginatedResult, SortDirection } from "@/common/types";
import {
  cacheWithDedup,
  convertDateToStr,
  getFallbackLanguage,
  getRequestLanguage,
} from "@/common/utils";
import { buildSort } from "@/common/utils/db";
import {
  ProviderEnum,
  UserStatusEnum,
  UserSubscriptionStatusEnum,
} from "@/core";
import { IUserRepository } from "@/core/abstracts/repositories/user-repository.abstract";
import {
  GetAllUserResponse,
  GetUserQuery,
  NewUserIdentity,
  User,
  UserCvData,
  UserProfile,
  UserTrends,
  UserTrendsQuery,
} from "@/core/entities";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Cache } from "cache-manager";
import { differenceInYears, endOfDay, startOfDay } from "date-fns";
import {
  and,
  arrayOverlaps,
  asc,
  count,
  countDistinct,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  not,
  or,
  sql,
  SQL,
} from "drizzle-orm";
import {
  categories,
  skills,
  subscriptions,
  userEducations,
  userExperiences,
  userIdentities,
  userOnboardings,
  users,
  userSkills,
  userSubscriptions,
} from "../models";
import { organizations } from "../models/organization.model";
import { DBDrizzleTransaction, type DBDrizzle } from "../types";
import { GenericRepository } from "./generic-repository";

@Injectable()
export class UserRepository
  extends GenericRepository<User, typeof users>
  implements IUserRepository
{
  private readonly logger = new Logger(UserRepository.name);

  constructor(
    @Inject("DRIZZLE") protected db: DBDrizzle,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    super(db, users);
  }

  get(id: string): Promise<User | null> {
    const key = CACHE_KEYS.user.get(id);
    return cacheWithDedup<User | null>(
      key,
      () => this.cacheManager.get<User | null>(key),
      () => super.get(id),
      (data: User | null) =>
        this.cacheManager.set<User | null>(key, data, SHORT_TTL),
      {
        logger: this.logger,
      },
    );
  }

  private async getLocalizedRows<T>(params: {
    getRowsByLanguage: (languageCode: string) => Promise<T[]>;
    getFallbackRows: () => Promise<T[]>;
  }): Promise<T[]> {
    const requestLanguage = getRequestLanguage();
    const fallbackLanguage = getFallbackLanguage();

    let rows = await params.getRowsByLanguage(requestLanguage);
    if (!rows.length && requestLanguage !== fallbackLanguage) {
      rows = await params.getRowsByLanguage(fallbackLanguage);
    }

    if (!rows.length) {
      rows = await params.getFallbackRows();
    }

    return rows;
  }

  async getByField(
    field: Partial<User>,
    omit: (keyof User)[] = [],
  ): Promise<User[]> {
    const keys = Object.keys(field) as (keyof User)[];
    if (keys.length === 0) {
      return [];
    }

    const conditions = keys.map((key) => {
      const value = field[key];
      if (value === null) {
        return isNull((this._table as any)[key as string]);
      }
      return eq((this._table as any)[key as string], value);
    });

    if (field.status === undefined) {
      conditions.push(not(eq(users.status, UserStatusEnum.DELETED as any)));
    }

    const allColumns = Object.keys(this._table) as (keyof User)[];
    const selectedColumns = allColumns.filter((c) => !omit.includes(c));

    const result = await this.db
      .select({
        ...(selectedColumns as string[]).reduce(
          (acc, col) => ({ ...acc, [col]: (this._table as any)[col] }),
          {},
        ),
      })
      .from(this._table as any)
      .where(and(...conditions));

    return result as User[];
  }

  async update(
    where: Partial<User>,
    item: Partial<User>,
    tx?: DBDrizzleTransaction,
  ): Promise<User[]> {
    const data = await super.update(where, item, tx);

    const keys: string[] = [];
    for (const user of data) {
      const keyGet = CACHE_KEYS.user.get(user.id);
      keys.push(keyGet);
    }
    await this.cacheManager
      .mdel(keys)
      .catch((err) =>
        this.logger.warn(
          `[cache] Failed to invalidate cache for user ${keys.join(",")}:`,
          err,
        ),
      );
    return data;
  }

  async delete(
    where: Partial<User>,
    tx?: DBDrizzleTransaction,
  ): Promise<User[]> {
    const data = await super.delete(where, tx);

    const keys: string[] = [];
    for (const user of data) {
      const keyGet = CACHE_KEYS.user.get(user.id);
      keys.push(keyGet);
    }
    await this.cacheManager
      .mdel(keys)
      .catch((err) =>
        this.logger.warn(
          `[cache] Failed to invalidate cache for user ${keys.join(",")}:`,
          err,
        ),
      );
    return data;
  }

  async addUserIdentity(
    identity: NewUserIdentity,
    tx?: DBDrizzleTransaction,
  ): Promise<void> {
    const now = new Date();
    const set: Record<string, any> = {
      updatedAt: now,
      deletedAt: null,
    };
    if (identity.providerUserId !== undefined)
      set.providerUserId = identity.providerUserId;
    if (identity.providerEmail !== undefined)
      set.providerEmail = identity.providerEmail;
    if (identity.providerName !== undefined)
      set.providerName = identity.providerName;
    if (identity.providerPicture !== undefined)
      set.providerPicture = identity.providerPicture;

    const dbClient = tx || this.db;

    await dbClient
      .insert(userIdentities)
      .values(identity)
      .onConflictDoUpdate({
        target: [userIdentities.userId, userIdentities.provider],
        targetWhere: sql`${userIdentities.deletedAt} IS NULL`,
        set: set as any,
      });
  }

  async getUserLoginMethods(userId: string): Promise<
    {
      provider: string;
      createdAt: Date;
      providerUserId?: string | null;
      providerEmail?: string | null;
      providerName?: string | null;
      providerPicture?: string | null;
    }[]
  > {
    const result = await this.db
      .select({
        provider: userIdentities.provider,
        createdAt: userIdentities.createdAt,
        providerUserId: userIdentities.providerUserId,
        providerEmail: userIdentities.providerEmail,
        providerName: userIdentities.providerName,
        providerPicture: userIdentities.providerPicture,
      })
      .from(userIdentities)
      .where(
        sql`${userIdentities.userId} = ${userId} AND ${userIdentities.deletedAt} IS NULL`,
      )
      .orderBy(asc(userIdentities.createdAt));

    return result as any;
  }

  async getActiveUserIdentityId(
    userId: string,
    provider: ProviderEnum,
    tx?: DBDrizzleTransaction,
  ): Promise<string | null> {
    const dbClient = tx ?? this.db;
    const rows = await dbClient
      .select({ id: userIdentities.id })
      .from(userIdentities)
      .where(
        and(
          eq(userIdentities.userId, userId),
          eq(userIdentities.provider, provider as any),
          sql`${userIdentities.deletedAt} IS NULL`,
        ),
      )
      .limit(1);

    return rows[0]?.id ?? null;
  }

  async softDeleteUserIdentity(
    userId: string,
    provider: ProviderEnum,
    deletedAt: Date = new Date(),
    tx?: DBDrizzleTransaction,
  ): Promise<number> {
    const dbClient = tx ?? this.db;
    const rows = await dbClient
      .update(userIdentities)
      .set({ deletedAt, updatedAt: new Date() } as any)
      .where(
        and(
          eq(userIdentities.userId, userId),
          eq(userIdentities.provider, provider as any),
          sql`${userIdentities.deletedAt} IS NULL`,
        ),
      )
      .returning({ id: userIdentities.id });

    return rows.length;
  }

  async getUsersPendingDeletionToFinalize(purgeBefore: Date): Promise<User[]> {
    return this.db
      .select()
      .from(users)
      .where(
        and(
          eq(users.status, UserStatusEnum.PENDING_DELETION as any),
          isNotNull(users.purgeAfterAt),
          lte(users.purgeAfterAt, purgeBefore),
        ),
      );
  }

  async getAllWithOffset(
    query: GetUserQuery,
  ): Promise<PaginatedResult<GetAllUserResponse>> {
    const limit = query.limit ?? 10;
    const page = query.page ?? 1;
    const offset = (page - 1) * limit;

    const fields = this.ensureGetUsersColumns(query);
    const { db, countDb } = this.joinGetUsersBuilder(fields, query);
    const conditions = this.buildGetAllAdminUsersQuery(query);

    const [items, totalRow, summaryRow] = await Promise.all([
      db
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .limit(limit)
        .offset(offset)
        .orderBy(this.buildSort(query.sortBy, query.sortDirection)),
      countDb.where(conditions.length > 0 ? and(...conditions) : undefined),
      this.db
        .select({
          total: count(),
          verified: sql<number>`count(*) filter (where ${users.emailVerified} = true or ${users.phoneVerified} = true)`,
          admin: sql<number>`count(*) filter (where ${users.roles} && array[${RoleEnum.ADMIN},${RoleEnum.SUPER_ADMIN}]::varchar[])`,
          user: sql<number>`count(*) filter (where ${users.roles} && array[${RoleEnum.USER}]::varchar[] and not (${users.roles} && array[${RoleEnum.ADMIN},${RoleEnum.SUPER_ADMIN}]::varchar[]))`,
        })
        .from(users)
        .where(isNull(users.deletedAt)),
    ]);

    const total = Number(totalRow[0]?.count ?? 0);
    const summary = {
      total: Number(summaryRow[0]?.total ?? 0),
      verified: Number(summaryRow[0]?.verified ?? 0),
      admin: Number(summaryRow[0]?.admin ?? 0),
      user: Number(summaryRow[0]?.user ?? 0),
    };

    return {
      data: items,
      pagination: {
        total,
      },
      summary,
    };
  }

  private buildSort(sortBy?: string, sortDirection?: SortDirection) {
    if (!sortBy) {
      return sql`${users.createdAt} DESC`;
    }
    const mappingSort = {
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      deletedAt: users.deletedAt,
      email: users.email,
      name: users.name,
      username: users.username,
    };
    if (!mappingSort[sortBy]) {
      throw new Error(`Invalid sort by: ${sortBy}`);
    }
    return buildSort(mappingSort[sortBy], sortDirection);
  }

  private ensureGetUsersColumns(query: GetUserQuery) {
    const fields = query.fields || [];
    if (query.subscriptionId) {
      fields.push("subscription");
    }
    if (query.statusSubscription) {
      fields.push("userSubscription");
    }
    if (query.isSeekingJob) {
      fields.push("onboarding");
    }
    return fields;
  }

  private buildUserSubscriptionJoinCondition(query?: GetUserQuery) {
    const conditions: SQL[] = [
      eq(userSubscriptions.userId, users.id),
      isNull(userSubscriptions.deletedAt),
    ];

    if (query?.subscriptionId) {
      conditions.push(
        eq(userSubscriptions.subscriptionId, query.subscriptionId),
        eq(userSubscriptions.status, UserSubscriptionStatusEnum.ACTIVE),
      );
    } else if (query?.statusSubscription) {
      conditions.push(eq(userSubscriptions.status, query.statusSubscription));
    } else {
      conditions.push(
        eq(userSubscriptions.status, UserSubscriptionStatusEnum.ACTIVE),
      );
    }

    return and(...conditions);
  }

  private joinGetUsersBuilder(fields: string[], query?: GetUserQuery) {
    let needSubscription = false;
    let needUserSubscription = false;
    let needOnboarding = false;

    const selectedFields: Record<string, any> = {
      id: users.id,
      email: users.email,
      name: users.name,
      username: users.username,
      emailVerified: users.emailVerified,
      phone: users.phone,
      phoneVerified: users.phoneVerified,
      roles: users.roles,
      status: users.status,
      deletionRequestedAt: users.deletionRequestedAt,
      purgeAfterAt: users.purgeAfterAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      deletedAt: users.deletedAt,
      avatarUrl: users.avatarUrl,
    };

    for (const field of fields) {
      switch (field) {
        case "subscription":
          selectedFields["subscription"] = {
            id: subscriptions.id,
            name: subscriptions.name,
            price: subscriptions.price,
            billingCycle: subscriptions.billingCycle,
            isActive: subscriptions.isActive,
          };
          needSubscription = true;
          needUserSubscription = true;
          break;
        case "userSubscription":
          selectedFields["userSubscription"] = {
            id: userSubscriptions.id,
            startedAt: userSubscriptions.startedAt,
            expiredAt: userSubscriptions.expiredAt,
            status: userSubscriptions.status,
            createdAt: userSubscriptions.createdAt,
          };
          needUserSubscription = true;
          break;
        case "onboarding":
          selectedFields["expectedSalary"] = userOnboardings.expectedSalary;
          selectedFields["experienceYears"] = userOnboardings.experienceYears;
          needOnboarding = true;
          break;
        default:
          break;
      }
    }

    let db: any = this.db.select(selectedFields).from(users);
    let countDb: any = this.db
      .select({
        count: countDistinct(users.id).as("count"),
      })
      .from(users);

    if (needUserSubscription) {
      const subscriptionJoinCondition =
        this.buildUserSubscriptionJoinCondition(query);
      db = db.leftJoin(userSubscriptions, subscriptionJoinCondition);
      countDb = countDb.leftJoin(userSubscriptions, subscriptionJoinCondition);
    }

    if (needSubscription) {
      db = db.leftJoin(
        subscriptions,
        eq(userSubscriptions.subscriptionId, subscriptions.id),
      );
    }

    if (needOnboarding) {
      db = db.innerJoin(userOnboardings, eq(userOnboardings.userId, users.id));
      countDb = countDb.innerJoin(
        userOnboardings,
        eq(userOnboardings.userId, users.id),
      );
    }

    return { db, countDb };
  }

  private buildGetAllAdminUsersQuery(query: GetUserQuery) {
    const conditions: any[] = [];

    if (query.keyword) {
      const keyword = `%${query.keyword.toLowerCase()}%`;
      conditions.push(
        or(
          ilike(sql`${users.id}::text`, keyword),
          ilike(sql`coalesce(${users.username}, '')`, keyword),
          ilike(sql`coalesce(${users.name}, '')`, keyword),
          ilike(users.email, keyword),
        )!,
      );
    }

    if (query.isActive !== undefined) {
      if (query.isActive) {
        conditions.push(eq(users.status, "active"));
      } else {
        conditions.push(not(eq(users.status, "active")));
      }
    }

    if (query.isDeleted !== undefined) {
      if (query.isDeleted) {
        conditions.push(isNotNull(users.deletedAt));
      } else {
        conditions.push(isNull(users.deletedAt));
      }
    }

    if (query.subscriptionId) {
      conditions.push(
        eq(userSubscriptions.subscriptionId, query.subscriptionId),
        eq(userSubscriptions.status, UserSubscriptionStatusEnum.ACTIVE),
      );
    } else if (query.statusSubscription) {
      conditions.push(eq(userSubscriptions.status, query.statusSubscription));
    }

    if (query.roles) {
      conditions.push(arrayOverlaps(users.roles, query.roles));
    }

    if (query.userIds) {
      conditions.push(inArray(users.id, query.userIds));
    }

    if (query.isSeekingJob) {
      conditions.push(eq(userOnboardings.isSeekingJob, true));
    }

    return conditions;
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const key = CACHE_KEYS.user.getUserProfile(userId);

    return cacheWithDedup<UserProfile | null>(
      key,
      async () => {
        const cached = await this.cacheManager.get<UserProfile | null>(key);
        return cached;
      },
      async () => {
        const user = await this.get(userId);
        if (!user) {
          return null;
        }

        const [userSkillsResult, userExperiencesResult, userOnboardingResult] =
          await Promise.all([
            // Get user skills (skill IDs and names)
            this.db
              .select({ skillId: userSkills.skillId, skillName: skills.name })
              .from(userSkills)
              .leftJoin(skills, eq(userSkills.skillId, skills.id))
              .where(eq(userSkills.userId, userId)),

            // Get user experiences for calculating years
            this.getLocalizedRows({
              getRowsByLanguage: (languageCode) =>
                this.db
                  .select({
                    startDate: userExperiences.startDate,
                    endDate: userExperiences.endDate,
                  })
                  .from(userExperiences)
                  .where(
                    and(
                      eq(userExperiences.userId, userId),
                      eq(userExperiences.languageCode, languageCode),
                    ),
                  ),
              getFallbackRows: () =>
                this.db
                  .select({
                    startDate: userExperiences.startDate,
                    endDate: userExperiences.endDate,
                  })
                  .from(userExperiences)
                  .where(eq(userExperiences.userId, userId)),
            }),

            // Get user onboarding preferences
            this.db
              .select({
                provinceIds: userOnboardings.provinceIds,
                categoryIds: userOnboardings.categoryIds,
                expectedSalary: userOnboardings.expectedSalary,
                experienceYears: userOnboardings.experienceYears,
                isSeekingJob: userOnboardings.isSeekingJob,
              })
              .from(userOnboardings)
              .where(eq(userOnboardings.userId, userId)),
          ]);

        const onboarding = userOnboardingResult[0];
        const categoryIdsFromOnboarding = onboarding?.categoryIds || [];

        // Fetch category names if category IDs exist
        let categoryNames: string[] = [];
        if (categoryIdsFromOnboarding.length > 0) {
          const cats = await this.db
            .select({ name: categories.name })
            .from(categories)
            .where(inArray(categories.id, categoryIdsFromOnboarding));
          categoryNames = cats.map((c) => c.name);
        }

        const skillIds = userSkillsResult.map((row) => row.skillId);
        const skillNames = userSkillsResult
          .map((row) => row.skillName)
          .filter(Boolean) as string[];

        let experienceYears = 0;
        if (userExperiencesResult.length > 0) {
          const totalYears = userExperiencesResult.reduce((sum, exp) => {
            const startDate = new Date(exp.startDate);
            const endDate = exp.endDate ? new Date(exp.endDate) : new Date();
            const years = differenceInYears(endDate, startDate);
            return sum + years;
          }, 0);
          experienceYears = Math.max(0, totalYears);
        }

        const experienceYearsFromOnboarding = onboarding?.experienceYears;

        return {
          userId: user.id,
          skillIds,
          skillNames,
          experienceYears:
            typeof experienceYearsFromOnboarding === "number"
              ? Math.max(0, experienceYearsFromOnboarding)
              : experienceYears,
          provinceIds: onboarding?.provinceIds || [],
          categoryIds: categoryIdsFromOnboarding,
          categoryNames,
          expectedSalary: onboarding?.expectedSalary
            ? Number(onboarding.expectedSalary)
            : undefined,
          isSeekingJob: onboarding?.isSeekingJob ?? false,
        };
      },
      (data: UserProfile | null) => this.cacheManager.set(key, data, SHORT_TTL), // Cache for 10 minutes (or configure LONG_TTL)
      {
        logger: this.logger,
      },
    );
  }

  // [TODO] split to 3 function to usecase call(code respository can reuse after)
  async getUserCvData(userId: string): Promise<UserCvData | null> {
    const user = await this.get(userId);
    if (!user) {
      return null;
    }

    const [userSkillsResult, userExperiencesResult, userEducationsResult] =
      await Promise.all([
        // Get user skills with names
        this.db
          .select({ skillName: skills.name })
          .from(userSkills)
          .innerJoin(skills, eq(userSkills.skillId, skills.id))
          .where(eq(userSkills.userId, userId)),

        // Get user experiences with organization names
        this.getLocalizedRows({
          getRowsByLanguage: (languageCode) =>
            this.db
              .select({
                position: userExperiences.position,
                jobTitle: userExperiences.jobTitle,
                organizationName: organizations.name,
                startDate: userExperiences.startDate,
                endDate: userExperiences.endDate,
                description: userExperiences.description,
              })
              .from(userExperiences)
              .innerJoin(
                organizations,
                eq(userExperiences.organizationId, organizations.id),
              )
              .where(
                and(
                  eq(userExperiences.userId, userId),
                  eq(userExperiences.languageCode, languageCode),
                ),
              ),
          getFallbackRows: () =>
            this.db
              .select({
                position: userExperiences.position,
                jobTitle: userExperiences.jobTitle,
                organizationName: organizations.name,
                startDate: userExperiences.startDate,
                endDate: userExperiences.endDate,
                description: userExperiences.description,
              })
              .from(userExperiences)
              .innerJoin(
                organizations,
                eq(userExperiences.organizationId, organizations.id),
              )
              .where(eq(userExperiences.userId, userId)),
        }),

        // Get user educations with school names
        this.getLocalizedRows({
          getRowsByLanguage: (languageCode) =>
            this.db
              .select({
                degree: userEducations.educationLevel,
                major: userEducations.major,
                schoolName: organizations.name,
                startDate: userEducations.startDate,
                endDate: userEducations.endDate,
              })
              .from(userEducations)
              .innerJoin(
                organizations,
                eq(userEducations.schoolId, organizations.id),
              )
              .where(
                and(
                  eq(userEducations.userId, userId),
                  eq(userEducations.languageCode, languageCode),
                ),
              ),
          getFallbackRows: () =>
            this.db
              .select({
                degree: userEducations.educationLevel,
                major: userEducations.major,
                schoolName: organizations.name,
                startDate: userEducations.startDate,
                endDate: userEducations.endDate,
              })
              .from(userEducations)
              .innerJoin(
                organizations,
                eq(userEducations.schoolId, organizations.id),
              )
              .where(eq(userEducations.userId, userId)),
        }),
      ]);

    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      bio: user.bio,
      skills: userSkillsResult.map((row) => row.skillName),
      experiences: userExperiencesResult.map((exp) => ({
        position: exp.position,
        jobTitle: exp.jobTitle,
        organizationName: exp.organizationName,
        startDate: exp.startDate,
        endDate: exp.endDate,
        description: exp.description,
      })),
      educations: userEducationsResult.map((edu) => ({
        degree: edu.degree,
        major: edu.major,
        schoolName: edu.schoolName,
        startDate: edu.startDate,
        endDate: edu.endDate,
      })),
    };
  }

  async getUserTrends(params: UserTrendsQuery): Promise<UserTrends[]> {
    const { fromDate, toDate } = params;

    const whereConditions: SQL[] = [];

    if (fromDate) {
      whereConditions.push(
        gte(users.createdAt, startOfDay(new Date(fromDate))),
      );
    }
    if (toDate) {
      whereConditions.push(lte(users.createdAt, endOfDay(new Date(toDate))));
    }
    const dateExpr = sql`DATE(${users.createdAt})`;

    const result = await this.db
      .select({
        date: dateExpr,
        count: countDistinct(users.id).as("count"),
      })
      .from(users)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .groupBy(dateExpr)
      .orderBy(asc(dateExpr));

    return result.map((r) => ({
      date: convertDateToStr(r.date as string),
      count: Number(r.count),
    }));
  }
}
