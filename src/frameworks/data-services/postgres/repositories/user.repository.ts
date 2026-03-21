import { GenericRepository } from "./generic-repository";
import { type DBDrizzle } from "../types";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  users,
  userSkills,
  userExperiences,
  userOnboardings,
  userEducations,
  skills,
} from "../models";
import { organizations } from "../models/organization.model";
import { NewUser, User, UserProfile, UserCvData } from "@/core/entities";
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
import { DrizzleCasbinAdapter } from "@/frameworks/auth-services/casbin/casbin.adapter";
import { RoleEnum } from "@/common/constants";
import { differenceInYears } from "date-fns";
import { convertDateToStr } from "@/common/utils";

@Injectable()
export class UserRepository
  extends GenericRepository<User, typeof users>
  implements IUserRepository
{
  private readonly casbinAdapter: DrizzleCasbinAdapter;
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, users);
    this.casbinAdapter = new DrizzleCasbinAdapter(db);
  }

  async getAllWithOffset(
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
    const conditions: any[] = [];
    if (query.keyword) {
      const keyword = `%${query.keyword.toLowerCase()}%`;
      conditions.push(
        or(
          ilike(users.username, keyword),
          ilike(users.name, keyword),
          ilike(users.email, keyword),
        ),
      );
    }
    if (query.isActive !== undefined) {
      conditions.push(eq(users.status, "active"));
    }
    if (query.isDeleted !== undefined) {
      if (query.isDeleted) {
        conditions.push(isNotNull(users.deletedAt));
      } else {
        conditions.push(isNull(users.deletedAt));
      }
    }
    let queryBuilder = this.db
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
      .from(users) as any; // Type casting to any to bypass the type issue with complex where conditions

    if (conditions.length > 0) {
      queryBuilder = queryBuilder.where(and(...conditions));
    }
    const result = await queryBuilder
      .limit(query.limit || 10)
      .offset(query.page ? (query.page - 1) * (query.limit || 10) : 0)
      .orderBy(
        query.sortBy
          ? query.sortDirection === "desc"
            ? sql`${sql.raw(query.sortBy)} DESC`
            : sql`${sql.raw(query.sortBy)} ASC`
          : sql`${users.createdAt} DESC`,
      );

    const total = await this.db
      .select({
        count: count(),
      })
      .from(users)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return {
      data: result,
      pagination: {
        total: Number(total[0].count) || 0,
      },
    };
  }

  async createUser(user: NewUser): Promise<User> {
    const userData = await this.db.insert(users).values(user).returning();
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

    return {
      userId: user.id,
      skillIds,
      experienceYears,
      provinceIds: onboarding?.provinceIds || [],
      categoryIds: onboarding?.categoryIds || [],
      expectedSalary: onboarding?.expectedSalary
        ? Number(onboarding.expectedSalary)
        : undefined,
    };
  }

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

    const result = await this.db
      .select({
        date: users.createdAt,
        count: countDistinct(users.id).as("count"),
      })
      .from(users)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .groupBy(users.createdAt)
      .orderBy(asc(users.createdAt));

    return result.map((r) => ({
      date: convertDateToStr(r.date),
      count: Number(r.count),
    }));
  }
}
