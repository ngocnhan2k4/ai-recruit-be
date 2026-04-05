import {
  CrawledSkillResponse,
  GetListSkillResponse,
  ISkillRepository,
  Skill,
  SkillFilter,
  SkillReviewStatus,
} from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { skills, questions, jobSkills, userSkills } from "../models";
import { GeneralQuery, PaginatedResult } from "@/common/types";
import {
  count,
  ilike,
  and,
  SQL,
  sql,
  isNotNull,
  asc,
  desc,
  eq,
  inArray,
} from "drizzle-orm";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "cache-manager";
import { CACHE_KEYS } from "@/common/constants/cache";

@Injectable()
export class SkillRepository
  extends GenericRepository<Skill, typeof skills>
  implements ISkillRepository
{
  constructor(
    @Inject("DRIZZLE") protected db: DBDrizzle,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    super(db, skills);
  }

  async createMany(skillValues: Omit<Skill, "id">[]): Promise<Skill[]> {
    const result = await this.db
      .insert(skills)
      .values(skillValues)
      .onConflictDoNothing({
        target: [skills.name],
      })
      .returning();

    return result;
  }

  async getPaginatedSkills(
    query: SkillFilter,
  ): Promise<PaginatedResult<GetListSkillResponse>> {
    const limit = query.limit ?? 10;
    const page = query.page ?? 1;
    const sortBy = query.sortBy === "questionCount" ? "questionCount" : "name";
    const sortDirection = query.sortDirection;
    const offset = (page - 1) * limit;
    const includeQuestionCount = query.fields?.includes("questionCount");

    if (sortBy === "questionCount" && !includeQuestionCount) {
      throw Error("Sory by question count only support when fields include it");
    }

    // Step 1: build where
    const whereClause = and(...this.buildWhereCondition(query));

    const questionCountExpr = count(questions.id).as("questionCount");

    const selectFields = {
      id: skills.id,
      slug: skills.slug,
      name: skills.name,
    };

    if (includeQuestionCount) {
      selectFields["questionCount"] = questionCountExpr;
    }

    // Step 2: build select
    let baseQuery = this.db
      .select(selectFields)
      .from(skills)
      .where(whereClause);

    // Step 3: build join
    baseQuery = this.joinBuilder(baseQuery, query);

    const orderByClause =
      sortBy === "questionCount"
        ? sortDirection === "desc"
          ? desc(questionCountExpr)
          : asc(questionCountExpr)
        : sortDirection === "desc"
          ? desc(skills.name)
          : asc(skills.name);

    const [rows, totalRow] = await Promise.all([
      baseQuery.orderBy(orderByClause).limit(limit).offset(offset),
      this.db
        .select({ count: count(skills.id) })
        .from(skills)
        .where(whereClause),
    ]);

    const data = rows.map((r) => ({
      ...r,
      questionCount: includeQuestionCount
        ? Number((r as any).questionCount ?? 0)
        : undefined,
    }));
    const total = Number(totalRow[0].count ?? 0);
    const hasNext = offset + data.length < total;

    return {
      data,
      pagination: {
        total,
        hasNextPage: hasNext,
      },
    };
  }

  private buildWhereCondition(query: SkillFilter) {
    const keyword = query.keyword ?? "";
    const skillIds = query.skillIds || [];

    const whereConditions: SQL[] = [
      isNotNull(skills.description),
      eq(skills.isApproved, true),
    ];

    if (keyword) {
      whereConditions.push(ilike(skills.name, `%${keyword}%`));
    }

    if (skillIds.length > 0) {
      whereConditions.push(inArray(skills.id, skillIds));
    }

    if (query.questions) {
      whereConditions.push(sql`EXISTS (
        SELECT 1 FROM ${questions}
        WHERE ${questions.skillId} = ${skills.id}
      )`);
    }

    return whereConditions;
  }

  private joinBuilder(db: any, query: SkillFilter) {
    let _db = db;

    const fields = query.fields || [];

    if (fields.includes("questionCount")) {
      _db = _db
        .leftJoin(questions, eq(questions.skillId, skills.id))
        .groupBy(skills.id);
    }

    return _db;
  }

  async getSkillById(id: string): Promise<Pick<Skill, "name" | "id"> | null> {
    const skill = await this.db
      .select({
        id: skills.id,
        name: skills.name,
      })
      .from(skills)
      .where(and(eq(skills.id, id), eq(skills.isApproved, true)))
      .limit(1);

    return skill[0] ?? null;
  }

  async getCrawledSkills(
    query: GeneralQuery,
  ): Promise<PaginatedResult<CrawledSkillResponse>> {
    const limit = query.limit ?? 10;
    const page = query.page ?? 1;
    const offset = (page - 1) * limit;

    const whereConditions: SQL[] = [eq(skills.isApproved, false)];

    const whereClause = and(...whereConditions);

    const [rows, totalRow] = await Promise.all([
      this.db
        .select({
          id: skills.id,
          name: skills.name,
          createdAt: skills.createdAt,
        })
        .from(skills)
        .where(whereClause)
        .orderBy(desc(skills.createdAt))
        .limit(limit)
        .offset(offset),

      this.db
        .select({ count: count(skills.id) })
        .from(skills)
        .where(whereClause),
    ]);

    const data: CrawledSkillResponse[] = rows.map((r) => ({
      ...r,
      synonym: null,
    }));
    const total = Number(totalRow[0].count ?? 0);
    const hasNext = offset + data.length < total;

    return {
      data,
      pagination: {
        total,
        hasNextPage: hasNext,
      },
    };
  }

  async bulkReviewSkills(
    ids: string[],
    status: SkillReviewStatus,
  ): Promise<void> {
    if (ids.length === 0) return;

    if (status === SkillReviewStatus.APPROVED) {
      await this.db
        .update(skills)
        .set({ isApproved: true })
        .where(inArray(skills.id, ids));
    } else {
      await this.db.transaction(async (tx) => {
        await tx.delete(jobSkills).where(inArray(jobSkills.skillId, ids));
        await tx.delete(skills).where(inArray(skills.id, ids));
      });
    }

    // Invalidate the cache whenever skills are reviewed (approved or deleted)
    await this.cacheManager.del(CACHE_KEYS.skill.getAll());
  }

  async deleteSkillAndReferences(skillId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.delete(jobSkills).where(eq(jobSkills.skillId, skillId));
      await tx.delete(userSkills).where(eq(userSkills.skillId, skillId));
      await tx.delete(questions).where(eq(questions.skillId, skillId));
      await tx.delete(skills).where(eq(skills.id, skillId));
    });

    await this.cacheManager.del(CACHE_KEYS.skill.getAll());
  }
}
