import {
  GetListSkillResponse,
  ISkillRepository,
  Skill,
  SkillFilter,
} from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { skills, questions } from "../models";
import { PaginatedResult } from "@/common/types";
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

    const whereConditions: SQL[] = [isNotNull(skills.description)];

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
      .where(eq(skills.id, id))
      .limit(1);

    return skill[0] ?? null;
  }
}
