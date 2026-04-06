import { GenericRepository } from "./generic-repository";
import { DBDrizzleTransaction, type DBDrizzle } from "../types";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  users,
  userSkills,
  userExperiences,
  userOnboardings,
  userEducations,
  skills,
  userIdentities,
  subscriptions,
  userSubscriptions,
} from "../models";
import { organizations } from "../models/organization.model";
import {
  NewUser,
  User,
  UserProfile,
  UserCvData,
  NewUserIdentity,
  GetAllUserResponse,
  UserSubscriptionStatusEnum,
} from "@/core/entities";
import {
  ilike,
  or,
  eq,
  count,
  isNotNull,
  and,
  sql,
  desc,
  SQL,
  not,
  arrayOverlaps,
  gte,
  lte,
  countDistinct,
  asc,
} from "drizzle-orm";
import { isNull } from "lodash";
import { PaginatedResult } from "@/common/types";
import { GetUserQuery, UserTrends, UserTrendsQuery } from "@/core/entities";
import { IUserRepository } from "@/core/abstracts/repositories/user-repository.abstract";
import { RoleEnum } from "@/common/constants";
import { differenceInYears } from "date-fns";
import { convertDateToStr } from "@/common/utils";
import { ProviderEnum } from "@/core";

@Injectable()
export class UserRepository
  extends GenericRepository<User, typeof users>
  implements IUserRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, users);
  }
  async addUserIdentity(
    identity: NewUserIdentity,
    tx?: DBDrizzleTransaction,
  ): Promise<void> {
    const set: Record<string, any> = {
      updatedAt: new Date(),
    };
    if (identity.providerUserId !== undefined)
      set.providerUserId = identity.providerUserId;
    if (identity.providerEmail !== undefined)
      set.providerEmail = identity.providerEmail;
    if (identity.providerName !== undefined)
      set.providerName = identity.providerName;
    if (identity.providerPicture !== undefined)
      set.providerPicture = identity.providerPicture;

    await (tx || this.db)
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

  async getAllWithOffset(
    query: GetUserQuery,
  ): Promise<PaginatedResult<GetAllUserResponse>> {
    const limit = query.limit ?? 10;
    const page = query.page ?? 1;
    const offset = (page - 1) * limit;

    const conditions = this.buildGetAllAdminUsersQuery(query);

    const queryBuilder = this.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        username: users.username,
        emailVerified: users.emailVerified,
        phone: users.phone,
        phoneVerified: users.phoneVerified,
        roles: users.roles,
        status: users.status,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        deletedAt: users.deletedAt,

        subscription: {
          id: subscriptions.id,
          name: subscriptions.name,
          price: subscriptions.price,
          billingCycle: subscriptions.billingCycle,
          isActive: subscriptions.isActive,
        },

        userSubscription: {
          id: userSubscriptions.id,
          startedAt: userSubscriptions.startedAt,
          expiredAt: userSubscriptions.expiredAt,
          status: userSubscriptions.status,
          createdAt: userSubscriptions.createdAt,
        },
      })
      .from(users)
      .leftJoin(
        userSubscriptions,
        and(
          eq(userSubscriptions.userId, users.id),
          eq(userSubscriptions.status, UserSubscriptionStatusEnum.ACTIVE),
        ),
      )
      .leftJoin(
        subscriptions,
        eq(userSubscriptions.subscriptionId, subscriptions.id),
      ) as any; // Type casting to any to bypass the type issue with complex where conditions

    const [items, totalRow] = await Promise.all([
      queryBuilder
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .limit(limit)
        .offset(offset)
        .orderBy(
          query.sortBy
            ? query.sortDirection === "desc"
              ? sql`${sql.raw(query.sortBy)} DESC`
              : sql`${sql.raw(query.sortBy)} ASC`
            : sql`${users.createdAt} DESC`,
        ),
      this.db
        .select({
          count: countDistinct(users.id).as("count"),
        })
        .from(users)
        .leftJoin(userSubscriptions, eq(userSubscriptions.userId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined),
    ]);

    const total = Number(totalRow[0]?.count ?? 0);

    return {
      data: items,
      pagination: {
        total,
      },
    };
  }

  private buildGetAllAdminUsersQuery(query: GetUserQuery) {
    const conditions: any[] = [];

    if (query.keyword) {
      const keyword = `%${query.keyword.toLowerCase()}%`;
      conditions.push(
        or(
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
      );
    }

    if (query.statusSubscription) {
      conditions.push(eq(userSubscriptions.status, query.statusSubscription));
    }

    if (query.roles) {
      conditions.push(arrayOverlaps(users.roles, query.roles));
    }

    return conditions;
  }

  async createUser(user: NewUser, tx: DBDrizzleTransaction): Promise<User> {
    const userData = await (tx || this.db)
      .insert(users)
      .values(user)
      .returning();
    return userData[0];
  }

  async adminUpdateUser(userId: string, user: Partial<User>): Promise<User> {
    const updatedUser = (
      await this.db
        .update(users)
        .set({
          ...user,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning()
    )[0];
    if (!updatedUser) {
      throw new NotFoundException("User not found");
    }
    return updatedUser;
  }

  async getAllAdminUsers(
    query: GetUserQuery,
  ): Promise<
    PaginatedResult<
      Pick<
        User,
        | "id"
        | "email"
        | "name"
        | "username"
        | "emailVerified"
        | "phone"
        | "phoneVerified"
        | "roles"
        | "status"
        | "createdAt"
        | "updatedAt"
        | "deletedAt"
      >
    >
  > {
    const { page = 1, limit = 10 } = query;

    const conditions: SQL[] = [];

    // Filter for admin roles
    conditions.push(
      arrayOverlaps(users.roles, [RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN]),
    );

    if (query.keyword) {
      const keyword = `%${query.keyword.toLowerCase()}%`;
      conditions.push(
        or(
          ilike(sql`coalesce(${users.username}, '')`, keyword),
          ilike(sql`coalesce(${users.name}, '')`, keyword),
          ilike(users.email, keyword),
        )!,
      );
    }

    if (query.isActive !== undefined) {
      conditions.push(eq(users.status, "active"));
    }

    if (query.isActive !== undefined) {
      if (query.isActive) {
        conditions.push(eq(users.status, "active"));
      } else {
        conditions.push(not(eq(users.status, "active")));
      }
    }

    const queryBuilder = this.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        username: users.username,
        emailVerified: users.emailVerified,
        phone: users.phone,
        phoneVerified: users.phoneVerified,
        roles: users.roles,
        status: users.status,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        deletedAt: users.deletedAt,
      })
      .from(users)
      .where(and(...conditions))
      .orderBy(desc(users.createdAt))
      .offset((page - 1) * limit)
      .limit(limit + 1);

    const result = await queryBuilder;

    const hasNextPage = result.length > limit;
    const data = hasNextPage ? result.slice(0, limit) : result;

    // Get total count for pagination
    const totalResult = await this.db
      .select({ count: count() })
      .from(users)
      .where(and(...conditions));

    const total = Number(totalResult[0]?.count ?? 0);

    return {
      data,
      pagination: {
        hasNextPage,
        total,
      },
    };
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const user = await this.get(userId);
    if (!user) {
      return null;
    }

    const [userSkillsResult, userExperiencesResult, userOnboardingResult] =
      await Promise.all([
        // Get user skills (skill IDs)
        this.db
          .select({ skillId: userSkills.skillId })
          .from(userSkills)
          .where(eq(userSkills.userId, userId)),

        // Get user experiences for calculating years
        this.db
          .select({
            startDate: userExperiences.startDate,
            endDate: userExperiences.endDate,
          })
          .from(userExperiences)
          .where(eq(userExperiences.userId, userId)),

        // Get user onboarding preferences
        this.db
          .select({
            provinceIds: userOnboardings.provinceIds,
            categoryIds: userOnboardings.categoryIds,
            expectedSalary: userOnboardings.expectedSalary,
            experienceYears: userOnboardings.experienceYears,
          })
          .from(userOnboardings)
          .where(eq(userOnboardings.userId, userId)),
      ]);

    const skillIds = userSkillsResult.map((row) => row.skillId);

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

    const onboarding = userOnboardingResult[0];
    const experienceYearsFromOnboarding = onboarding?.experienceYears;

    return {
      userId: user.id,
      skillIds,
      experienceYears:
        typeof experienceYearsFromOnboarding === "number"
          ? Math.max(0, experienceYearsFromOnboarding)
          : experienceYears,
      provinceIds: onboarding?.provinceIds || [],
      categoryIds: onboarding?.categoryIds || [],
      expectedSalary: onboarding?.expectedSalary
        ? Number(onboarding.expectedSalary)
        : undefined,
    };
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

        // Get user educations with school names
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
      whereConditions.push(gte(users.createdAt, new Date(fromDate)));
    }
    if (toDate) {
      whereConditions.push(lte(users.createdAt, new Date(toDate)));
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
