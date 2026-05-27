import {
  IQuestionRepository,
  QuestionTranslationRecord,
  Question,
  QuestionFilters,
  NewQuestion,
} from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { questionTranslation, questions } from "../models";
import { GeneralQuery, PaginatedResult } from "@/common/types";
import { count, ilike, and, SQL, eq, ne, inArray, sql } from "drizzle-orm";

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

    if (query.excludeSkillId) {
      whereConditions.push(ne(questions.skillId, query.excludeSkillId));
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
    const requestLanguage = query.requestLanguage || "vi";
    const fallbackLanguage = query.fallbackLanguage || "vi";
    const translatedItems = await this.applyQuestionTranslations(
      items,
      requestLanguage,
      fallbackLanguage,
    );

    const hasNext = offset + items.length < total;

    return {
      data: translatedItems,
      pagination: {
        hasNextPage: hasNext,
        total,
      },
    } as PaginatedResult<Question>;
  }

  async getActiveQuestionsBySkills(
    skillIds: string[],
    difficultyLevels?: string[],
    requestLanguage = "vi",
    fallbackLanguage = "vi",
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

    const items = await this.db
      .select()
      .from(questions)
      .where(and(...whereConditions));

    return this.applyQuestionTranslations(
      items,
      requestLanguage,
      fallbackLanguage,
    );
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

  async getQuestionByIdWithLanguage(
    id: string,
    requestLanguage = "vi",
    fallbackLanguage = "vi",
  ): Promise<Question | null> {
    const [question] = await this.db
      .select()
      .from(questions)
      .where(eq(questions.id, id))
      .limit(1);

    if (!question) {
      return null;
    }

    const [translated] = await this.applyQuestionTranslations(
      [question],
      requestLanguage,
      fallbackLanguage,
    );

    return translated || null;
  }

  async getQuestionsByIdsWithLanguage(
    ids: string[],
    requestLanguage = "vi",
    fallbackLanguage = "vi",
  ): Promise<Question[]> {
    if (!ids.length) {
      return [];
    }

    const rows = await this.db
      .select()
      .from(questions)
      .where(inArray(questions.id, ids));

    const translatedRows = await this.applyQuestionTranslations(
      rows,
      requestLanguage,
      fallbackLanguage,
    );

    const byId = new Map(translatedRows.map((item) => [item.id, item]));
    return ids.map((id) => byId.get(id)).filter((item) => !!item) as Question[];
  }

  async getQuestionTranslation(
    questionId: string,
    languageCode: string,
  ): Promise<QuestionTranslationRecord | null> {
    const [row] = await this.db
      .select({
        id: questionTranslation.id,
        questionId: questionTranslation.questionId,
        languageCode: questionTranslation.languageCode,
        questionText: questionTranslation.questionText,
        options: questionTranslation.options,
        correctAnswer: questionTranslation.correctAnswer,
      })
      .from(questionTranslation)
      .where(
        and(
          eq(questionTranslation.questionId, questionId),
          eq(questionTranslation.languageCode, languageCode),
        ),
      )
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      ...row,
      options: row.options,
    };
  }

  async upsertQuestionTranslation(
    questionId: string,
    languageCode: string,
    data: Pick<
      QuestionTranslationRecord,
      "questionText" | "options" | "correctAnswer"
    >,
  ): Promise<QuestionTranslationRecord> {
    const [row] = await this.db
      .insert(questionTranslation)
      .values({
        questionId,
        languageCode,
        questionText: data.questionText,
        options: data.options,
        correctAnswer: data.correctAnswer,
      })
      .onConflictDoUpdate({
        target: [
          questionTranslation.questionId,
          questionTranslation.languageCode,
        ],
        set: {
          questionText: data.questionText,
          options: data.options,
          correctAnswer: data.correctAnswer,
          updatedAt: new Date(),
          deletedAt: null,
        },
      })
      .returning({
        id: questionTranslation.id,
        questionId: questionTranslation.questionId,
        languageCode: questionTranslation.languageCode,
        questionText: questionTranslation.questionText,
        options: questionTranslation.options,
        correctAnswer: questionTranslation.correctAnswer,
      });

    return {
      ...row,
      options: row.options,
    };
  }

  private async applyQuestionTranslations(
    questionRows: Question[],
    requestLanguage: string,
    fallbackLanguage: string,
  ): Promise<Question[]> {
    if (!questionRows.length) {
      return questionRows;
    }

    const questionIds = questionRows.map((item) => item.id);
    const languagePriority = [requestLanguage, fallbackLanguage].filter(
      (value, index, array) => value && array.indexOf(value) === index,
    );
    if (!languagePriority.length) {
      return questionRows;
    }

    const rows = await this.db
      .select({
        questionId: questionTranslation.questionId,
        languageCode: questionTranslation.languageCode,
        questionText: questionTranslation.questionText,
        options: questionTranslation.options,
        correctAnswer: questionTranslation.correctAnswer,
      })
      .from(questionTranslation)
      .where(
        and(
          inArray(questionTranslation.questionId, questionIds),
          inArray(questionTranslation.languageCode, languagePriority),
        ),
      );

    return questionRows.map((item) => {
      const found = rows.find(
        (row) =>
          row.questionId === item.id &&
          row.languageCode === languagePriority[0],
      );
      const fallback = rows.find(
        (row) =>
          row.questionId === item.id &&
          row.languageCode === languagePriority[1],
      );
      const translation = found || fallback;

      if (!translation) {
        return item;
      }

      return {
        ...item,
        questionText: translation.questionText || item.questionText,
        options: translation.options || item.options,
        correctAnswer: translation.correctAnswer || item.correctAnswer,
      };
    });
  }
}
