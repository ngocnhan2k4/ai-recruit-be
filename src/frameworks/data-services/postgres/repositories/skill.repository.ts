import { ISkillRepository, Skill, SkillWithQuestionCount } from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { skills, questions } from "../models";
import { GeneralQuery, PaginatedResult } from "@/common/types";
import { SkillQuery } from "@/core/entities";
import {
  count,
  ilike,
  and,
  SQL,
  sql,
  isNotNull,
  inArray,
  asc,
  desc,
  eq,
} from "drizzle-orm";
@Injectable()
export class SkillRepository
  extends GenericRepository<Skill, typeof skills>
  implements ISkillRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
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

  async getPaginatedSkills(query: SkillQuery): Promise<PaginatedResult<Skill>> {
    const limit = Math.max(query.limit ?? 20, 1);
    const page = Math.max(query.page ?? 1, 1);
    const keyword = query.keyword ?? "";

    const skillIds = query.skillIds ?? [];
    const whereConditions: SQL[] = [isNotNull(skills.description)];

    if (keyword) {
      whereConditions.push(ilike(skills.name, `%${keyword}%`));
    }

    if (skillIds.length > 0) {
      whereConditions.push(inArray(skills.id, skillIds));
    }

    const offset = (page - 1) * limit;

    const items = await this.db
      .select()
      .from(skills)
      .where(and(...whereConditions))
      .limit(limit)
      .offset(offset);

    const totalRow = await this.db
      .select({ count: count(skills.id) })
      .from(skills)
      .where(and(...whereConditions));
    const total = Number(totalRow[0]?.count ?? 0);

    const hasNext = offset + items.length < total;

    return {
      data: items,
      pagination: {
        hasNextPage: hasNext,
        total,
      },
    } as PaginatedResult<Skill>;
  }

  async getSkillsWithQuestions(
    query: GeneralQuery,
  ): Promise<PaginatedResult<Skill>> {
    const limit = Math.max(query.limit ?? 20, 1);
    const page = Math.max(query.page ?? 1, 1);
    const keyword = query.keyword ?? "";

    const whereConditions: SQL[] = [
      sql`EXISTS (
        SELECT 1 FROM ${questions}
        WHERE ${questions.skillId} = ${skills.id}
      )`,
    ];

    if (keyword) {
      whereConditions.push(ilike(skills.name, `%${keyword}%`));
    }

    const offset = (page - 1) * limit;

    const items = await this.db
      .select()
      .from(skills)
      .where(and(...whereConditions))
      .limit(limit)
      .offset(offset);

    const totalRow = await this.db
      .select({ count: count(skills.id) })
      .from(skills)
      .where(and(...whereConditions));
    const total = Number(totalRow[0]?.count ?? 0);

    const hasNext = offset + items.length < total;

    return {
      data: items,
      pagination: {
        hasNextPage: hasNext,
        total,
      },
    } as PaginatedResult<Skill>;
  }

  async getSkillsWithQuestionCount(
    query: GeneralQuery,
  ): Promise<PaginatedResult<SkillWithQuestionCount>> {
    const limit = Math.max(query.limit ?? 20, 1);
    const page = Math.max(query.page ?? 1, 1);
    const keyword = query.keyword ?? "";
    const sortBy = query.sortBy === "questionCount" ? "questionCount" : "name";
    const sortDirection = query.sortDirection === "desc" ? "desc" : "asc";

    const whereConditions: SQL[] = [isNotNull(skills.description)];

    if (keyword) {
      whereConditions.push(ilike(skills.name, `%${keyword}%`));
    }

    const totalRow = await this.db
      .select({ count: count(skills.id) })
      .from(skills)
      .where(and(...whereConditions));
    const total = Number(totalRow[0]?.count ?? 0);

    if (total === 0) {
      return {
        data: [],
        pagination: { hasNextPage: false, total: 0 },
      } as PaginatedResult<SkillWithQuestionCount>;
    }

    if (sortBy === "questionCount") {
      const offset = (page - 1) * limit;
      const orderByCount =
        sortDirection === "desc"
          ? sql`(SELECT count(*)::int FROM questions WHERE questions.skill_id = ${skills.id}) DESC`
          : sql`(SELECT count(*)::int FROM questions WHERE questions.skill_id = ${skills.id}) ASC`;

      const rows = await this.db
        .select({
          id: skills.id,
          slug: skills.slug,
          name: skills.name,
          description: skills.description,
          proficiencyLevels: skills.proficiencyLevels,
          createdAt: skills.createdAt,
          updatedAt: skills.updatedAt,
          deletedAt: skills.deletedAt,
          questionCount:
            sql<number>`(SELECT count(*)::int FROM questions WHERE questions.skill_id = ${skills.id})`.as(
              "question_count",
            ),
        })
        .from(skills)
        .where(and(...whereConditions))
        .orderBy(orderByCount)
        .limit(limit)
        .offset(offset);

      const data: SkillWithQuestionCount[] = rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        description: r.description,
        proficiencyLevels: r.proficiencyLevels,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        deletedAt: r.deletedAt,
        questionCount: Number(r.questionCount ?? 0),
      }));
      const hasNext = offset + data.length < total;

      return {
        data,
        pagination: { hasNextPage: hasNext, total },
      } as PaginatedResult<SkillWithQuestionCount>;
    }

    const offset = (page - 1) * limit;
    const orderBy =
      sortDirection === "desc" ? desc(skills.name) : asc(skills.name);

    const items = await this.db
      .select()
      .from(skills)
      .where(and(...whereConditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    const skillIds = items.map((s) => s.id);
    const countRows = await this.db
      .select({
        skillId: questions.skillId,
        questionCount: count(questions.id),
      })
      .from(questions)
      .where(inArray(questions.skillId, skillIds))
      .groupBy(questions.skillId);

    const countMap = new Map(
      countRows.map((r) => [r.skillId, Number(r.questionCount)]),
    );

    const data: SkillWithQuestionCount[] = items.map((s) => ({
      ...s,
      questionCount: countMap.get(s.id) ?? 0,
    }));

    const hasNext = offset + items.length < total;

    return {
      data,
      pagination: {
        hasNextPage: hasNext,
        total,
      },
    } as PaginatedResult<SkillWithQuestionCount>;
  }

  async getSkillById(id: string): Promise<Skill | null> {
    const skill = await this.db
      .select()
      .from(skills)
      .where(eq(skills.id, id))
      .limit(1);

    return skill[0] ?? null;
  }
}
