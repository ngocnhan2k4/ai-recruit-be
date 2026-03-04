import {
  IQuestionRepository,
  Question,
  QuestionFilters,
  NewQuestion,
} from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { questions } from "../models";
import { GeneralQuery, PaginatedResult } from "@/common/types";
import { count, ilike, and, SQL, eq, inArray, sql } from "drizzle-orm";

@Injectable()
export class QuestionRepository
  extends GenericRepository<Question, typeof questions>
  implements IQuestionRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, questions);
  }

  async getPaginatedQuestions(
    query: GeneralQuery & QuestionFilters,
  ): Promise<PaginatedResult<Question>> {
    const limit = Math.max(query.limit ?? 20, 1);
    const page = Math.max(query.page ?? 1, 1);
    const keyword = query.keyword ?? "";

    const whereConditions: SQL[] = [];

    if (keyword) {
      whereConditions.push(ilike(questions.questionText, `%${keyword}%`));
    }

    if (query.skillId) {
      whereConditions.push(eq(questions.skillId, query.skillId));
    }

    if (query.skillIds && query.skillIds.length > 0) {
      whereConditions.push(inArray(questions.skillId, query.skillIds));
    }

    if (query.difficultyLevels && query.difficultyLevels.length > 0) {
      whereConditions.push(
        sql`EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(${questions.difficultyLevels}) elem
          WHERE elem = ANY(ARRAY[${sql.join(
            query.difficultyLevels.map((level) => sql.raw(`'${level}'`)),
            sql`, `,
          )}]::text[])
        )`,
      );
    }

    if (query.isActive !== undefined) {
      whereConditions.push(eq(questions.isActive, query.isActive));
    }

    const offset = (page - 1) * limit;

    const items = await this.db
      .select()
      .from(questions)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .limit(limit)
      .offset(offset);

    const totalRow = await this.db
      .select({ count: count(questions.id) })
      .from(questions)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);
    const total = Number(totalRow[0]?.count ?? 0);

    const hasNext = offset + items.length < total;

    return {
      data: items,
      pagination: {
        hasNextPage: hasNext,
        total,
      },
    } as PaginatedResult<Question>;
  }

  async getActiveQuestionsBySkills(
    skillIds: string[],
    difficultyLevels?: string[],
  ): Promise<Question[]> {
    const whereConditions: SQL[] = [
      eq(questions.isActive, true),
      inArray(questions.skillId, skillIds),
    ];

    if (difficultyLevels && difficultyLevels.length > 0) {
      whereConditions.push(
        sql`EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(${questions.difficultyLevels}) elem
          WHERE elem = ANY(ARRAY[${sql.join(
            difficultyLevels.map((level) => sql.raw(`'${level}'`)),
            sql`, `,
          )}]::text[])
        )`,
      );
    }

    return await this.db
      .select()
      .from(questions)
      .where(and(...whereConditions));
  }

  async createMany(questionValues: Partial<Question>[]): Promise<Question[]> {
    const result = await this.db
      .insert(questions)
      .values(questionValues as unknown as NewQuestion[])
      .returning();

    return result;
  }

  async toggleActive(id: string, isActive: boolean): Promise<Question> {
    const result = await this.db
      .update(questions)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(questions.id, id))
      .returning();

    return result[0];
  }
}
