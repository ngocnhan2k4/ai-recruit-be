import { Injectable, Inject } from "@nestjs/common";
import { eq, and, isNull, inArray, ilike } from "drizzle-orm";
import {
  ISubpathRepository,
  IOptionResourceCompletionRepository,
  ISubpathModuleQuizResultRepository,
} from "@/core/abstracts";
import {
  Subpath,
  SubpathWithDetails,
  OptionResourceCompletion,
  SubpathModuleQuizResult,
  AISubpathResult,
  ResourceTypeEnum,
} from "@/core";
import {
  subpaths,
  userSubpathSnapshots,
  subpathModules,
  subpathResources,
  subpathQuizQuestions,
  optionResourceCompletions,
  subpathModuleQuizResults,
} from "../models";
import { type DBDrizzle } from "../types";
import { GenericRepository } from "./generic-repository";

@Injectable()
export class SubpathRepository
  extends GenericRepository<Subpath, typeof subpaths>
  implements ISubpathRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, subpaths);
  }

  async findSharedByNaturalKey(payload: {
    optionName: string;
    targetRole: string;
    currentRole: string;
  }): Promise<{ id: string } | null> {
    const [row] = await this.db
      .select({ id: subpaths.id })
      .from(subpaths)
      .where(
        and(
          ilike(subpaths.optionName, payload.optionName),
          ilike(subpaths.targetRole, payload.targetRole),
          ilike(subpaths.currentRole, payload.currentRole),
          isNull(subpaths.deletedAt),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async findByOptionId(optionId: string): Promise<SubpathWithDetails | null> {
    const [snapshot] = await this.db
      .select({ snapshotOfId: userSubpathSnapshots.snapshotOfId })
      .from(userSubpathSnapshots)
      .where(
        and(
          eq(userSubpathSnapshots.roadmapSkillOptionId, optionId),
          isNull(userSubpathSnapshots.deletedAt),
        ),
      )
      .limit(1);

    if (!snapshot) return null;

    return this._loadSubpath(
      and(eq(subpaths.id, snapshot.snapshotOfId), isNull(subpaths.deletedAt)),
      optionId,
    );
  }

  async getUserSubpathByOptionId(
    optionId: string,
  ): Promise<{ id: string; snapshotOfId: string } | null> {
    const [row] = await this.db
      .select()
      .from(userSubpathSnapshots)
      .where(
        and(
          eq(userSubpathSnapshots.roadmapSkillOptionId, optionId),
          isNull(userSubpathSnapshots.deletedAt),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async cloneSharedSubpathForUser(
    sharedSubpathId: string,
    roadmapSkillOptionId: string,
    userId: string,
  ): Promise<{ id: string }> {
    const [existing] = await this.db
      .select()
      .from(userSubpathSnapshots)
      .where(
        and(
          eq(userSubpathSnapshots.roadmapSkillOptionId, roadmapSkillOptionId),
          isNull(userSubpathSnapshots.deletedAt),
        ),
      )
      .limit(1);

    if (existing) return existing;

    return this.executeWithTransaction(async (db) => {
      const [snapshot] = await db
        .insert(userSubpathSnapshots)
        .values({ userId, roadmapSkillOptionId, snapshotOfId: sharedSubpathId })
        .returning();

      // Copy all shared modules + their resources into the user's snapshot
      const sharedModules = await db
        .select()
        .from(subpathModules)
        .where(
          and(
            eq(subpathModules.subpathId, sharedSubpathId),
            isNull(subpathModules.snapshotId),
            isNull(subpathModules.deletedAt),
          ),
        )
        .orderBy(subpathModules.orderIndex);

      if (sharedModules.length === 0) return snapshot;

      const copiedModules = await db
        .insert(subpathModules)
        .values(
          sharedModules.map((m) => ({
            subpathId: sharedSubpathId,
            snapshotId: snapshot.id,
            title: m.title,
            description: m.description,
            duration: m.duration,
            category: m.category,
            concepts: m.concepts,
            orderIndex: m.orderIndex,
          })),
        )
        .returning();

      // Copy resources and quiz questions for each module
      for (let i = 0; i < sharedModules.length; i++) {
        const [sharedResources, sharedQuiz] = await Promise.all([
          db
            .select()
            .from(subpathResources)
            .where(
              and(
                eq(subpathResources.moduleId, sharedModules[i].id),
                isNull(subpathResources.deletedAt),
              ),
            ),
          db
            .select()
            .from(subpathQuizQuestions)
            .where(
              and(
                eq(subpathQuizQuestions.moduleId, sharedModules[i].id),
                isNull(subpathQuizQuestions.deletedAt),
              ),
            ),
        ]);

        if (sharedResources.length > 0) {
          await db.insert(subpathResources).values(
            sharedResources.map((r) => ({
              moduleId: copiedModules[i].id,
              title: r.title,
              url: r.url,
              type: r.type,
              description: r.description,
              isFree: r.isFree,
              orderIndex: r.orderIndex,
              quickCheck: r.quickCheck,
            })),
          );
        }

        if (sharedQuiz.length > 0) {
          await db.insert(subpathQuizQuestions).values(
            sharedQuiz.map((q) => ({
              moduleId: copiedModules[i].id,
              question: q.question,
              options: q.options,
              correctAnswerIndex: q.correctAnswerIndex,
              explanation: q.explanation,
              orderIndex: q.orderIndex,
            })),
          );
        }
      }

      return snapshot;
    });
  }

  async createFromAIResult(
    payload: {
      optionName: string;
      targetRole: string;
      currentRole: string;
    },
    ai: AISubpathResult,
  ): Promise<SubpathWithDetails> {
    const run = async (db) => {
      const [subpath] = await db
        .insert(subpaths)
        .values({
          optionName: payload.optionName,
          targetRole: payload.targetRole,
          currentRole: payload.currentRole,
          title: ai.title,
          description: ai.description,
          duration: ai.duration,
          tags: ai.tags,
        })
        .onConflictDoNothing()
        .returning();

      if (!subpath) {
        // Another concurrent writer won — load by natural key
        const [existing] = await db
          .select()
          .from(subpaths)
          .where(
            and(
              eq(subpaths.optionName, payload.optionName),
              eq(subpaths.targetRole, payload.targetRole),
              eq(subpaths.currentRole, payload.currentRole),
              isNull(subpaths.deletedAt),
            ),
          )
          .limit(1);
        return this._loadSubpath(
          and(eq(subpaths.id, existing.id), isNull(subpaths.deletedAt)),
        ) as Promise<SubpathWithDetails>;
      }

      const createdModules = await db
        .insert(subpathModules)
        .values(
          ai.subNodes.map((mod) => ({
            subpathId: subpath.id,
            title: mod.title,
            description: mod.description,
            duration: mod.duration,
            concepts: mod.concepts,
            orderIndex: mod.orderIndex,
          })),
        )
        .returning();

      const resourceRows = ai.subNodes.flatMap((mod, i) =>
        mod.resources.map((r) => ({
          moduleId: createdModules[i].id,
          title: r.title,
          url: r.url,
          type: r.type as ResourceTypeEnum,
          description: r.description,
          isFree: r.isFree ?? true,
          orderIndex: r.orderIndex,
          quickCheck: r.quickCheck?.length ? r.quickCheck : [],
        })),
      );
      const allResources =
        resourceRows.length > 0
          ? await db.insert(subpathResources).values(resourceRows).returning()
          : [];

      const quizRows = ai.subNodes.flatMap((mod, i) =>
        mod.quiz.map((q) => ({
          moduleId: createdModules[i].id,
          question: q.question,
          options: q.options,
          correctAnswerIndex: q.correctAnswerIndex,
          explanation: q.explanation,
          orderIndex: q.orderIndex,
        })),
      );
      const allQuiz =
        quizRows.length > 0
          ? await db.insert(subpathQuizQuestions).values(quizRows).returning()
          : [];

      // Group resources and quiz back by moduleId
      const resourcesByModule = new Map<string, typeof allResources>();
      for (const r of allResources) {
        const list = resourcesByModule.get(r.moduleId) ?? [];
        list.push(r);
        resourcesByModule.set(r.moduleId, list);
      }
      const quizByModule = new Map<string, typeof allQuiz>();
      for (const q of allQuiz) {
        const list = quizByModule.get(q.moduleId) ?? [];
        list.push(q);
        quizByModule.set(q.moduleId, list);
      }

      const subNodesWithChildren = createdModules.map((mod) => ({
        ...mod,
        resources: resourcesByModule.get(mod.id) ?? [],
        quizQuestions: quizByModule.get(mod.id) ?? [],
      }));

      return { ...subpath, subNodes: subNodesWithChildren };
    };

    return this.executeWithTransaction(run);
  }

  private async _loadSubpath(
    condition: any,
    optionId?: string,
  ): Promise<SubpathWithDetails | null> {
    const [subpath] = await this.db
      .select()
      .from(subpaths)
      .where(condition)
      .limit(1);

    if (!subpath) return null;

    // When optionId is given, load the user's snapshot modules only
    // Otherwise load shared template modules (snapshotId IS NULL)
    let snapshotId: string | null = null;
    if (optionId) {
      const [snap] = await this.db
        .select({ id: userSubpathSnapshots.id })
        .from(userSubpathSnapshots)
        .where(
          and(
            eq(userSubpathSnapshots.roadmapSkillOptionId, optionId),
            isNull(userSubpathSnapshots.deletedAt),
          ),
        )
        .limit(1);
      snapshotId = snap?.id ?? null;
    }

    const moduleFilter = snapshotId
      ? eq(subpathModules.snapshotId, snapshotId)
      : isNull(subpathModules.snapshotId);

    const modules = await this.db
      .select()
      .from(subpathModules)
      .where(
        and(
          eq(subpathModules.subpathId, subpath.id),
          isNull(subpathModules.deletedAt),
          moduleFilter,
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

  async deleteResource(resourceId: string): Promise<void> {
    await this.db
      .update(subpathResources)
      .set({ deletedAt: new Date() })
      .where(eq(subpathResources.id, resourceId));
  }

  async deleteModule(moduleId: string): Promise<void> {
    await this.db
      .update(subpathModules)
      .set({ deletedAt: new Date() })
      .where(eq(subpathModules.id, moduleId));
  }

  async addModule(
    snapshotId: string,
    module: {
      title: string;
      description: string;
      duration: string;
      category?: string;
      concepts: string[];
    },
  ): Promise<{ id: string; title: string }> {
    const [snapshot] = await this.db
      .select({ snapshotOfId: userSubpathSnapshots.snapshotOfId })
      .from(userSubpathSnapshots)
      .where(eq(userSubpathSnapshots.id, snapshotId))
      .limit(1);

    if (!snapshot) throw new Error(`Snapshot ${snapshotId} not found`);

    const existing = await this.db
      .select({ orderIndex: subpathModules.orderIndex })
      .from(subpathModules)
      .where(
        and(
          eq(subpathModules.snapshotId, snapshotId),
          isNull(subpathModules.deletedAt),
        ),
      )
      .orderBy(subpathModules.orderIndex);

    const maxOrder =
      existing.length > 0 ? existing[existing.length - 1].orderIndex : -1;

    const [inserted] = await this.db
      .insert(subpathModules)
      .values({
        subpathId: snapshot.snapshotOfId,
        snapshotId,
        title: module.title,
        description: module.description,
        duration: module.duration,
        category: module.category,
        concepts: module.concepts,
        orderIndex: maxOrder + 1,
      })
      .returning({ id: subpathModules.id, title: subpathModules.title });

    return inserted;
  }

  async getModuleOwnerUserId(moduleId: string): Promise<string | null> {
    const [row] = await this.db
      .select({ userId: userSubpathSnapshots.userId })
      .from(subpathModules)
      .innerJoin(
        userSubpathSnapshots,
        and(
          eq(subpathModules.snapshotId, userSubpathSnapshots.id),
          isNull(userSubpathSnapshots.deletedAt),
        ),
      )
      .where(
        and(eq(subpathModules.id, moduleId), isNull(subpathModules.deletedAt)),
      )
      .limit(1);
    return row?.userId ?? null;
  }

  async getResourceOwnerUserId(resourceId: string): Promise<string | null> {
    const [row] = await this.db
      .select({ userId: userSubpathSnapshots.userId })
      .from(subpathResources)
      .innerJoin(
        subpathModules,
        and(
          eq(subpathResources.moduleId, subpathModules.id),
          isNull(subpathModules.deletedAt),
        ),
      )
      .innerJoin(
        userSubpathSnapshots,
        and(
          eq(subpathModules.snapshotId, userSubpathSnapshots.id),
          isNull(userSubpathSnapshots.deletedAt),
        ),
      )
      .where(
        and(
          eq(subpathResources.id, resourceId),
          isNull(subpathResources.deletedAt),
        ),
      )
      .limit(1);
    return row?.userId ?? null;
  }

  async addResourcesToModule(
    moduleId: string,
    resources: Array<{
      title: string;
      url: string;
      type: string;
      isFree?: boolean;
    }>,
  ): Promise<void> {
    const existing = await this.db
      .select({ orderIndex: subpathResources.orderIndex })
      .from(subpathResources)
      .where(
        and(
          eq(subpathResources.moduleId, moduleId),
          isNull(subpathResources.deletedAt),
        ),
      )
      .orderBy(subpathResources.orderIndex);

    const maxOrder =
      existing.length > 0 ? existing[existing.length - 1].orderIndex : -1;

    await this.db.insert(subpathResources).values(
      resources.map((r, i) => ({
        moduleId,
        title: r.title,
        url: r.url || "",
        type: (r.type as ResourceTypeEnum) ?? ResourceTypeEnum.ARTICLE,
        isFree: r.isFree ?? true,
        orderIndex: maxOrder + 1 + i,
        description: "",
      })),
    );
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

  async getManyByFields(
    userId: string,
    resourceIds: string[],
  ): Promise<OptionResourceCompletion[]> {
    if (resourceIds.length === 0) return [];
    return this.db
      .select()
      .from(optionResourceCompletions)
      .where(
        and(
          eq(optionResourceCompletions.userId, userId),
          inArray(optionResourceCompletions.resourceId, resourceIds),
          isNull(optionResourceCompletions.deletedAt),
        ),
      );
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

  async getManyByModuleIds(
    userId: string,
    moduleIds: string[],
  ): Promise<SubpathModuleQuizResult[]> {
    if (moduleIds.length === 0) return [];
    return this.db
      .select()
      .from(subpathModuleQuizResults)
      .where(
        and(
          eq(subpathModuleQuizResults.userId, userId),
          inArray(subpathModuleQuizResults.moduleId, moduleIds),
          isNull(subpathModuleQuizResults.deletedAt),
        ),
      );
  }

  async upsert(
    userId: string,
    moduleId: string,
    score: number,
    totalQuestions: number,
  ): Promise<SubpathModuleQuizResult> {
    const passed = totalQuestions > 0 && score / totalQuestions >= 0.8;
    const now = new Date();
    const [row] = await this.db
      .insert(subpathModuleQuizResults)
      .values({
        userId,
        moduleId,
        score,
        totalQuestions,
        passed,
        attemptedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          subpathModuleQuizResults.userId,
          subpathModuleQuizResults.moduleId,
        ],
        set: {
          score,
          totalQuestions,
          passed,
          attemptedAt: now,
          updatedAt: now,
        },
      })
      .returning();
    return row;
  }
}
