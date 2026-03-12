import { ISkillRepository, Skill, SkillWithQuestionCount } from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { skills, questions } from "../models";
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

  async getPaginatedSkills(
    query: GeneralQuery,
  ): Promise<PaginatedResult<Skill>> {
    const limit = Math.max(query.limit ?? 20, 1);
    const page = Math.max(query.page ?? 1, 1);
    const keyword = query.keyword ?? "";

    const whereConditions: SQL[] = [isNotNull(skills.description)];

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
    query: GeneralQuery & {
      sortBy?: "name" | "questionCount";
      sortDirection?: "asc" | "desc";
    },
  ): Promise<PaginatedResult<SkillWithQuestionCount>> {
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    const page = Math.max(query.page ?? 1, 1);
    const keyword = query.keyword ?? "";
    const sortBy = query.sortBy ?? "name";
    const sortDirection = query.sortDirection ?? "asc";
    const offset = (page - 1) * limit;

    // Subquery: (skill_id, question_count) — tránh correlated subquery trong SELECT (Drizzle bind sai từng row)
    const qCounts = this.db
      .select({
        skillId: questions.skillId,
        questionCount: count(questions.id).as("questionCount"),
      })
      .from(questions)
      .groupBy(questions.skillId)
      .as("qcounts");

    const whereConditions: SQL[] = [];
    if (keyword) {
      whereConditions.push(ilike(skills.name, `%${keyword}%`));
    }
    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const orderColumn =
      sortBy === "questionCount"
        ? sortDirection === "desc"
          ? desc(qCounts.questionCount)
          : asc(qCounts.questionCount)
        : sortDirection === "desc"
          ? desc(skills.name)
          : asc(skills.name);

    const items = await this.db
      .select({
        id: skills.id,
        name: skills.name,
        description: skills.description,
        proficiencyLevels: skills.proficiencyLevels,
        createdAt: skills.createdAt,
        updatedAt: skills.updatedAt,
        deletedAt: skills.deletedAt,
        questionCount: qCounts.questionCount,
      })
      .from(skills)
      .innerJoin(qCounts, eq(skills.id, qCounts.skillId))
      .where(whereClause)
      .orderBy(orderColumn)
      .limit(limit)
      .offset(offset);

    const totalRow = await this.db
      .select({ count: count(skills.id) })
      .from(skills)
      .innerJoin(qCounts, eq(skills.id, qCounts.skillId))
      .where(whereClause);
    const total = Number(totalRow[0]?.count ?? 0);
    const hasNext = offset + items.length < total;

    const data = items.map((row) => ({
      ...row,
      questionCount: Number(row.questionCount ?? 0),
    }));

    return {
      data: data as SkillWithQuestionCount[],
      pagination: { hasNextPage: hasNext, total },
    };
  }

  async getSkillWithQuestionCount(
    id: string,
  ): Promise<SkillWithQuestionCount | null> {
    const skill = await this.get(id);
    if (!skill) return null;

    const countResult = await this.db
      .select({ count: count(questions.id) })
      .from(questions)
      .where(eq(questions.skillId, id));
    const questionCount = Number(countResult[0]?.count ?? 0);

    return {
      ...skill,
      questionCount,
    } as SkillWithQuestionCount;
  }
}
