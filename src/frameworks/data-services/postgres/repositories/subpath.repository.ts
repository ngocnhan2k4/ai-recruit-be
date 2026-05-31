import { Injectable, Inject } from "@nestjs/common";
import { eq, and, isNull } from "drizzle-orm";
import {
  IOptionSubpathRepository,
  IOptionResourceCompletionRepository,
  ISubpathModuleQuizResultRepository,
} from "@/core/abstracts";
import {
  OptionSubpath,
  SubpathWithDetails,
  OptionResourceCompletion,
  SubpathModuleQuizResult,
  AISubpathResult,
  ResourceTypeEnum,
} from "@/core";
import {
  optionSubpaths,
  subpathModules,
  subpathResources,
  subpathQuizQuestions,
  optionResourceCompletions,
  subpathModuleQuizResults,
} from "../models";
import { DBDrizzleTransaction, type DBDrizzle } from "../types";
import { GenericRepository } from "./generic-repository";

@Injectable()
export class OptionSubpathRepository
  extends GenericRepository<OptionSubpath, typeof optionSubpaths>
  implements IOptionSubpathRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, optionSubpaths);
  }

  async getByOptionId(optionId: string): Promise<SubpathWithDetails | null> {
    return this._loadSubpath(
      and(
        eq(optionSubpaths.optionId, optionId),
        isNull(optionSubpaths.deletedAt),
      ),
    );
  }

  async createFromAIResult(
    payload: { optionId?: string; skillId?: string },
    ai: AISubpathResult,
    tx?: DBDrizzleTransaction,
  ): Promise<SubpathWithDetails> {
    const db = tx || this.db;

    const [subpath] = await db
      .insert(optionSubpaths)
      .values({
        optionId: payload.optionId ?? null,
        skillId: payload.skillId ?? null,
        title: ai.title,
        description: ai.description,
        duration: ai.duration,
        tags: ai.tags,
      })
      .returning();

    const subNodesWithChildren: SubpathWithDetails["subNodes"] = [];

    for (const mod of ai.subNodes) {
      const [createdModule] = await db
        .insert(subpathModules)
        .values({
          subpathId: subpath.id,
          title: mod.title,
          description: mod.description,
          duration: mod.duration,
          category: mod.category,
          concepts: mod.concepts,
          orderIndex: mod.orderIndex,
        })
        .returning();

      const createdResources = await db
        .insert(subpathResources)
        .values(
          mod.resources.map((r) => ({
            moduleId: createdModule.id,
            title: r.title,
            url: r.url,
            type: r.type as ResourceTypeEnum,
            description: r.description,
            orderIndex: r.orderIndex,
            quickCheck: r.quickCheck?.length ? r.quickCheck : [],
          })),
        )
        .returning();

      const createdQuiz =
        mod.quiz.length > 0
          ? await db
              .insert(subpathQuizQuestions)
              .values(
                mod.quiz.map((q) => ({
                  moduleId: createdModule.id,
                  question: q.question,
                  options: q.options,
                  correctAnswerIndex: q.correctAnswerIndex,
                  explanation: q.explanation,
                  orderIndex: q.orderIndex,
                })),
              )
              .returning()
          : [];

      subNodesWithChildren.push({
        ...createdModule,
        resources: createdResources,
        quizQuestions: createdQuiz,
      });
    }

    return { ...subpath, subNodes: subNodesWithChildren };
  }

  private async _loadSubpath(
    condition: any,
  ): Promise<SubpathWithDetails | null> {
    const [subpath] = await this.db
      .select()
      .from(optionSubpaths)
      .where(condition)
      .limit(1);

    if (!subpath) return null;

    const modules = await this.db
      .select()
      .from(subpathModules)
      .where(
        and(
          eq(subpathModules.subpathId, subpath.id),
          isNull(subpathModules.deletedAt),
        ),
      )
      .orderBy(subpathModules.orderIndex);

    const subNodesWithChildren = await Promise.all(
      modules.map(async (mod) => {
        const [resources, quizQuestions] = await Promise.all([
          this.db
            .select()
            .from(subpathResources)
            .where(
              and(
                eq(subpathResources.moduleId, mod.id),
                isNull(subpathResources.deletedAt),
              ),
            )
            .orderBy(subpathResources.orderIndex),
          this.db
            .select()
            .from(subpathQuizQuestions)
            .where(
              and(
                eq(subpathQuizQuestions.moduleId, mod.id),
                isNull(subpathQuizQuestions.deletedAt),
              ),
            )
            .orderBy(subpathQuizQuestions.orderIndex),
        ]);
        return { ...mod, resources, quizQuestions };
      }),
    );

    return { ...subpath, subNodes: subNodesWithChildren };
  }
}

@Injectable()
export class OptionResourceCompletionRepository
  extends GenericRepository<
    OptionResourceCompletion,
    typeof optionResourceCompletions
  >
  implements IOptionResourceCompletionRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, optionResourceCompletions);
  }

  async getCompletedResourceIds(
    userId: string,
    moduleId: string,
  ): Promise<string[]> {
    const rows = await this.db
      .select({ resourceId: optionResourceCompletions.resourceId })
      .from(optionResourceCompletions)
      .innerJoin(
        subpathResources,
        eq(optionResourceCompletions.resourceId, subpathResources.id),
      )
      .where(
        and(
          eq(optionResourceCompletions.userId, userId),
          eq(subpathResources.moduleId, moduleId),
          isNull(optionResourceCompletions.deletedAt),
        ),
      );
    return rows.map((r) => r.resourceId);
  }

  async markCompleted(
    userId: string,
    resourceId: string,
  ): Promise<OptionResourceCompletion> {
    const [row] = await this.db
      .insert(optionResourceCompletions)
      .values({ userId, resourceId })
      .onConflictDoUpdate({
        target: [
          optionResourceCompletions.userId,
          optionResourceCompletions.resourceId,
        ],
        set: { completedAt: new Date(), deletedAt: null },
      })
      .returning();
    return row;
  }

  async markUncompleted(userId: string, resourceId: string): Promise<void> {
    await this.db
      .update(optionResourceCompletions)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(optionResourceCompletions.userId, userId),
          eq(optionResourceCompletions.resourceId, resourceId),
        ),
      );
  }

  async toggleCompletion(
    userId: string,
    resourceId: string,
  ): Promise<{ completed: boolean }> {
    const [existing] = await this.db
      .select()
      .from(optionResourceCompletions)
      .where(
        and(
          eq(optionResourceCompletions.userId, userId),
          eq(optionResourceCompletions.resourceId, resourceId),
          isNull(optionResourceCompletions.deletedAt),
        ),
      )
      .limit(1);

    if (existing) {
      await this.markUncompleted(userId, resourceId);
      return { completed: false };
    }
    await this.markCompleted(userId, resourceId);
    return { completed: true };
  }
}

@Injectable()
export class SubpathModuleQuizResultRepository
  extends GenericRepository<
    SubpathModuleQuizResult,
    typeof subpathModuleQuizResults
  >
  implements ISubpathModuleQuizResultRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, subpathModuleQuizResults);
  }

  async upsert(
    userId: string,
    moduleId: string,
    score: number,
    totalQuestions: number,
  ): Promise<SubpathModuleQuizResult> {
    const passed = totalQuestions > 0 && score / totalQuestions >= 0.8;
    const [row] = await this.db
      .insert(subpathModuleQuizResults)
      .values({
        userId,
        moduleId,
        score,
        totalQuestions,
        passed,
        attemptedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning();

    if (!row) {
      // Already exists — insert a new attempt row (no unique constraint per attempt)
      const [newRow] = await this.db
        .insert(subpathModuleQuizResults)
        .values({
          userId,
          moduleId,
          score,
          totalQuestions,
          passed,
          attemptedAt: new Date(),
        })
        .returning();
      return newRow;
    }
    return row;
  }
}
