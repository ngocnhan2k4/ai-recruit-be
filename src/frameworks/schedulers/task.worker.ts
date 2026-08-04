import { Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import {
  DEFAULT_LANGUAGE_CODE,
  TASK_QUEUE,
  TranslationJobType,
  TRANSLATION_SUPPORTED_LANGUAGES,
} from "@/common/constants";
import {
  IAIService,
  ITaskRepository,
  IWebSocketGateway,
  ILearningRoadmapRepository,
  IRoadmapPhaseRepository,
  IRoadmapSkillRepository,
  IRoadmapSkillOptionRepository,
  INotificationRepository,
  ISubpathRepository,
  IFeatureService,
} from "@/core/abstracts";
import { INotificationService } from "@/core/abstracts/notification.abstract";
import { IMessageQueueService } from "@/core/abstracts/message-queue.abstract";
import { IAiCvRepository } from "@/core/abstracts/repositories/ai-cv-repository.abstract";
import {
  AILearningRoadmapResult,
  AISubpathResult,
  CvLanguageEnum,
  FeatureCodeEnum,
  NotificationType,
  NewAiCv,
  OptimizeAtsRequest,
  OptimizeAtsResponse,
  OptimizeAtsResponseV2,
  RoadmapGenerationStatusEnum,
  RoadmapSkillData,
  SkillOption,
  Task,
  TaskStatusEnum,
  TaskTypeEnum,
} from "@/core";
import { PreviewRoadmapDto } from "@/interfaces/dtos";
import { keyBy } from "lodash";
import {
  formatTrackedErrorLog,
  runJobWithContext,
} from "@/common/utils/job-context";
import { mapWithConcurrency } from "@/common/utils";

type TaskData = {
  taskId: string;
  notificationId: string;
};

type RoadmapSubpathOption = {
  skillId: string;
  skillName: string;
  optionId: string;
  optionName: string;
  keyConcepts: string[];
};

const SUBPATH_GENERATION_CONCURRENCY = 3;

export const MAX_TASK_ATTEMPTS = 3;

@Processor(TASK_QUEUE, {
  concurrency: 4,
})
export class TaskWorker extends WorkerHost {
  private readonly logger = new Logger(TaskWorker.name);

  constructor(
    private readonly aiService: IAIService,
    private readonly taskRepository: ITaskRepository,
    private readonly webSocketGateway: IWebSocketGateway,
    private readonly roadmapRepository: ILearningRoadmapRepository,
    private readonly phaseRepository: IRoadmapPhaseRepository,
    private readonly skillRepository: IRoadmapSkillRepository,
    private readonly skillOptionRepository: IRoadmapSkillOptionRepository,
    private readonly notificationRepository: INotificationRepository,
    private readonly notificationService: INotificationService,
    private readonly aiCvRepository: IAiCvRepository,
    private readonly messageQueueService: IMessageQueueService,
    private readonly subpathRepository: ISubpathRepository,
    private readonly featureService: IFeatureService,
  ) {
    super();
  }

  async process(job: Job) {
    return runJobWithContext(job, async () => {
      const runOptions = {
        attemptsMade: job.attemptsMade,
        maxAttempts: job.opts.attempts,
      };
      if (
        (job.name as TaskTypeEnum) === TaskTypeEnum.LEARNING_PATH_GENERATION
      ) {
        return this.processLearningPath(job.data as TaskData, runOptions);
      }

      if ((job.name as TaskTypeEnum) === TaskTypeEnum.CV_GENERATION) {
        return this.processOptimizeCv(job.data as TaskData, runOptions);
      }

      if ((job.name as TaskTypeEnum) === TaskTypeEnum.CV_GENERATION_V2) {
        return this.processOptimizeCvV2(job.data as TaskData, runOptions);
      }

      this.logger.warn(`[process] Unknown task job name: ${job.name}`);
    });
  }

  private async emitAndPersistTask(params: {
    taskId?: string;
    notificationId: string;
    userId: string;
    payload: Record<string, any>;
    message: string;
    taskData: {
      type: TaskTypeEnum;
      status: TaskStatusEnum;
      result?: Record<string, any> | null;
      error?: string | null;
    };
    templateData?: Record<string, any>;
  }) {
    const { notificationId, userId, payload, message, taskId } = params;
    const template = this.resolveTaskNotificationTemplate({
      taskType: params.taskData.type,
      status: params.taskData.status,
      message,
      templateData: params.templateData,
    });

    await this.taskRepository.executeWithTransaction(async (tx) => {
      await this.taskRepository.update(
        { id: taskId },
        { ...params.taskData, updatedAt: new Date() },
        tx,
      );

      await this.notificationRepository.update(
        { id: notificationId },
        {
          payload: {
            taskId,
            ...payload,
          },
          templateKey: template.templateKey,
          templateData: template.templateData,
          message,
          updatedAt: new Date(),
        },
        tx,
      );
    });

    await this.notificationService.sendNotification({
      id: notificationId,
      receiverId: userId,
      title: "",
      message,
      templateKey: template.templateKey,
      templateData: template.templateData,
      type: NotificationType.SYSTEM,
      payload,
      task: {
        id: taskId,
        ...params.taskData,
      },
    } as any);
  }

  private resolveTaskNotificationTemplate(params: {
    taskType: TaskTypeEnum;
    status: TaskStatusEnum;
    message: string;
    templateData?: Record<string, any>;
  }) {
    const baseData = params.templateData ?? {};

    if (params.taskType === TaskTypeEnum.LEARNING_PATH_GENERATION) {
      return {
        templateKey:
          params.status === TaskStatusEnum.IN_PROGRESS
            ? "system_learning_path_in_progress"
            : params.status === TaskStatusEnum.COMPLETED
              ? "system_learning_path_completed"
              : "system_learning_path_failed",
        templateData:
          params.status === TaskStatusEnum.FAILED
            ? { ...baseData, errorMessage: params.message }
            : baseData,
      };
    }

    return {
      templateKey:
        params.status === TaskStatusEnum.IN_PROGRESS
          ? "system_cv_generation_in_progress"
          : params.status === TaskStatusEnum.COMPLETED
            ? "system_cv_generation_completed"
            : "system_cv_generation_failed",
      templateData:
        params.status === TaskStatusEnum.FAILED
          ? { ...baseData, errorMessage: params.message }
          : baseData,
    };
  }

  private buildPrimaryKey(...args: string[]) {
    return args.join(":");
  }

  private resolveTranslationTargets() {
    return [...TRANSLATION_SUPPORTED_LANGUAGES];
  }

  /**
   * Fill user snapshots for every skill option on the roadmap.
   *
   * Runs AFTER persistRoadmapFromPreview. Options that already got a snapshot
   * from persistEagerlyGeneratedSubpaths (AI embedded subpath in roadmap JSON)
   * are skipped; the rest call AI generateSubPath + clone.
   */
  private async generateAllSubpathsForRoadmap(params: {
    roadmapId: string;
    userId: string;
    targetRole: string;
    currentRole: string;
  }) {
    const roadmapWithDetails =
      await this.roadmapRepository.getRoadmapWithDetails(params.roadmapId);

    if (!roadmapWithDetails) return;

    const allOptions: RoadmapSubpathOption[] =
      roadmapWithDetails.phases.flatMap((phase) =>
        phase.skills.flatMap((skill) =>
          skill.options.map((option) => ({
            skillId: skill.id,
            skillName: skill.skill,
            optionId: option.id,
            optionName: (option as any).optionName ?? skill.skill,
            keyConcepts: (option as any).keyConcepts ?? [],
          })),
        ),
      );

    if (allOptions.length === 0) return;

    // 1 query: which options already have a user_subpath_snapshot?
    const existingOptionIds =
      await this.subpathRepository.findExistingSnapshotOptionIds(
        allOptions.map((o) => o.optionId),
      );

    const pendingOptions = allOptions.filter(
      (o) => !existingOptionIds.has(o.optionId),
    );

    // Pass 1 — generate + clone missing options (bounded concurrency)
    await mapWithConcurrency(
      pendingOptions,
      (option) =>
        this.ensureUserSubpathForOption({
          ...params,
          option,
          notify: true,
        }),
      {
        concurrency: SUBPATH_GENERATION_CONCURRENCY,
        continueOnError: true,
      },
    );

    // Pass 2 — verify with 1 lightweight query, retry only still-missing
    const readyOptionIds =
      await this.subpathRepository.findExistingSnapshotOptionIds(
        allOptions.map((o) => o.optionId),
      );
    const missing = allOptions.filter((o) => !readyOptionIds.has(o.optionId));

    if (missing.length > 0) {
      this.logger.warn(
        `[${TaskTypeEnum.LEARNING_PATH_GENERATION}] Verification pass: ${missing.length}/${allOptions.length} options still missing snapshots — retrying`,
      );

      await mapWithConcurrency(
        missing,
        async (option) => {
          const ok = await this.ensureUserSubpathForOption({
            ...params,
            option,
            notify: true,
          });
          if (ok) {
            this.logger.log(
              `[${TaskTypeEnum.LEARNING_PATH_GENERATION}] Verification pass recovered "${option.optionName}"`,
            );
          } else {
            this.logger.error(
              `[${TaskTypeEnum.LEARNING_PATH_GENERATION}] Verification pass also failed for "${option.optionName}"`,
            );
          }
        },
        {
          concurrency: SUBPATH_GENERATION_CONCURRENCY,
          continueOnError: true,
        },
      );
    }

    this.logger.log(
      `[${TaskTypeEnum.LEARNING_PATH_GENERATION}] Subpath generation complete for ${allOptions.length} options in roadmap ${params.roadmapId}`,
    );
  }

  /**
   * Shared helper for both eager persist and generate-all passes.
   *
   * Flow per option:
   *   1) Find shared template (optionName + targetRole + currentRole)
   *   2) If missing → use aiSubpath (if provided) OR call AI generateSubPath,
   *      then insert into `subpaths` (+ modules/resources/quiz)
   *   3) Clone into user_subpath_snapshots for this user + option
   *   4) Optionally WS notify SKILL_READY
   */
  private async ensureUserSubpathForOption(params: {
    roadmapId: string;
    userId: string;
    targetRole: string;
    currentRole: string;
    option: RoadmapSubpathOption;
    notify?: boolean;
    /** When set (eager path), skip the AI generateSubPath call */
    aiSubpath?: AISubpathResult;
  }): Promise<boolean> {
    const { userId, targetRole, currentRole, option, notify, aiSubpath } =
      params;
    const { skillId, skillName, optionId, optionName, keyConcepts } = option;

    try {
      // Shared template — reusable across users with same role pair + option name
      let shared = await this.subpathRepository.findSharedByNaturalKey({
        optionName,
        targetRole,
        currentRole,
      });

      if (!shared) {
        const result =
          aiSubpath ??
          (await this.aiService.generateSubPath({
            optionName,
            keyConcepts,
            targetRole,
            currentRole,
          }));
        shared = await this.subpathRepository.createFromAIResult(
          { optionName, targetRole, currentRole },
          result,
        );
      }

      // Per-user copy so edits/progress don't mutate the shared template
      await this.subpathRepository.cloneSharedSubpathForUser(
        shared.id,
        optionId,
        userId,
      );

      if (notify) {
        this.webSocketGateway.sendToUser({ userId }, {
          type: NotificationType.SKILL_READY,
          skillId,
          optionId,
          roadmapId: params.roadmapId,
          skillName,
          failed: false,
        } as any);
      }
      return true;
    } catch (err: any) {
      this.logger.error(
        `[${TaskTypeEnum.LEARNING_PATH_GENERATION}] Subpath gen failed for "${optionName}": ${err.message}`,
      );
      if (notify) {
        this.webSocketGateway.sendToUser({ userId }, {
          type: NotificationType.SKILL_READY,
          skillId,
          optionId,
          roadmapId: params.roadmapId,
          skillName,
          failed: true,
        } as any);
      }
      return false;
    }
  }

  private async enqueueRoadmapTranslationJobs(params: {
    phaseIds: string[];
    skillIds: string[];
    sourceLanguage: string;
  }) {
    const targetLanguages = this.resolveTranslationTargets();
    if (!targetLanguages.length) {
      return;
    }

    await Promise.all([
      ...params.phaseIds.map((phaseId) =>
        this.messageQueueService.addTranslation(
          TranslationJobType.ROADMAP_PHASE,
          {
            phaseId,
            sourceLanguage: params.sourceLanguage,
            targetLanguages,
          },
        ),
      ),
      ...params.skillIds.map((skillId) =>
        this.messageQueueService.addTranslation(
          TranslationJobType.ROADMAP_SKILL,
          {
            skillId,
            sourceLanguage: params.sourceLanguage,
            targetLanguages,
          },
        ),
      ),
    ]);
  }

  /**
   * Persist AI roadmap preview into DB, then optionally save embedded subpaths.
   *
   * Order:
   *   1) TX: update skeleton roadmap → phases → skills → options → prerequisites
   *   2) Outside TX: persistEagerlyGeneratedSubpaths (only options where AI
   *      already attached `option.subpath` in generateRoadmapV2 response)
   *   3) Enqueue i18n translation jobs
   *
   * Options without embedded subpath are handled later by generateAllSubpathsForRoadmap.
   */
  private async persistRoadmapFromPreview(data: {
    roadmapId: string;
    userId: string;
    request: PreviewRoadmapDto;
    result: AILearningRoadmapResult;
    sourceLanguage: string;
  }) {
    const { roadmapId, userId, request, result, sourceLanguage } = data;
    const preview = result.previewData;
    const phases = preview.phases || [];

    // --- 1) Core roadmap structure (must succeed atomically) ---
    const persisted = await this.roadmapRepository.executeWithTransaction(
      async () => {
        // Skeleton was created PENDING at API time; fill real content + mark COMPLETED
        const newRoadmap = await this.updateRoadmapRecord({
          roadmapId,
          userId,
          request,
          preview,
        });

        const { createdPhases, phaseMap } = await this.createPhasesFromPreview({
          roadmapId: newRoadmap.id,
          phases,
        });

        const { createdSkills, skillMap } = await this.createSkillsFromPreview({
          roadmapId: newRoadmap.id,
          phases,
          phaseMap,
        });

        // Also collects readySubpaths = options that already include AI subpath JSON
        const { readySubpaths, skillIdMap } =
          await this.createSkillOptionsFromPreview({
            roadmapId: newRoadmap.id,
            phases,
            phaseMap,
            skillMap,
          });

        await this.mapSkillPrerequisites({
          phases,
          skillIdMap,
        });

        return {
          roadmap: newRoadmap,
          phaseIds: createdPhases.map((item) => item.id),
          skillIds: createdSkills.map((item) => item.id),
          readySubpaths,
        };
      },
    );

    // --- 2) Subpaths already present in AI roadmap response (no extra AI call) ---
    await this.persistEagerlyGeneratedSubpaths({
      userId,
      targetRole: request.targetRole ?? "",
      currentRole: request.currentRole ?? "",
      readySubpaths: persisted.readySubpaths,
    });

    // --- 3) Background translation of phase/skill text ---
    await this.enqueueRoadmapTranslationJobs({
      phaseIds: persisted.phaseIds,
      skillIds: persisted.skillIds,
      sourceLanguage,
    });

    return persisted.roadmap;
  }

  private async updateRoadmapRecord(params: {
    roadmapId: string;
    userId: string;
    request: PreviewRoadmapDto;
    preview: AILearningRoadmapResult["previewData"];
  }) {
    const { roadmapId, userId, request, preview } = params;
    const [updated] = await this.roadmapRepository.update(
      { id: roadmapId, userId },
      {
        title: request.targetRole,
        currentRole: request.currentRole,
        targetRole: request.targetRole,
        timeCommitmentHoursPerWeek: request.timeCommitmentHoursPerWeek,
        currentSkills: request.currentSkills,
        totalWeeks: preview.totalWeeks,
        gapAnalysis: preview.gapAnalysis,
        generationStatus: RoadmapGenerationStatusEnum.COMPLETED,
        generatedAt: new Date(),
        updatedAt: new Date(),
      },
    );

    if (!updated) {
      throw new Error(`Roadmap skeleton not found: ${roadmapId}`);
    }

    return updated;
  }

  private async createPhasesFromPreview(params: {
    roadmapId: string;
    phases: Array<{
      name: string;
      description: string;
      durationWeeks: number;
      skills: RoadmapSkillData[];
    }>;
  }) {
    const { roadmapId, phases } = params;
    const createdPhases = await this.phaseRepository.createMany(
      phases.map((phase, index) => ({
        roadmapId,
        name: phase.name,
        description: phase.description,
        durationWeeks: phase.durationWeeks,
        orderIndex: index,
      })),
    );

    const phaseMap = keyBy(createdPhases, (phase) =>
      this.buildPrimaryKey(
        phase.roadmapId,
        phase.name,
        String(phase.orderIndex),
      ),
    );

    return { createdPhases, phaseMap };
  }

  private async createSkillsFromPreview(params: {
    roadmapId: string;
    phases: Array<{
      name: string;
      skills: RoadmapSkillData[];
    }>;
    phaseMap: Record<string, { id: string }>;
  }) {
    const { roadmapId, phases, phaseMap } = params;

    const newSkills = phases.flatMap((phase, phaseIndex) =>
      (phase.skills || []).map((skill, skillIndex) => {
        const matchedPhase =
          phaseMap[
            this.buildPrimaryKey(roadmapId, phase.name, String(phaseIndex))
          ];

        return {
          phaseId: matchedPhase.id,
          skill: skill.skill,
          description: skill.description,
          weekStart: skill.weekStart,
          weekEnd: skill.weekEnd,
          orderIndex: skillIndex,
          prerequisites: [] as string[],
        };
      }),
    );

    const createdSkills = await this.skillRepository.createMany(newSkills);
    const skillMap = keyBy(createdSkills, (skill) =>
      this.buildPrimaryKey(
        skill.phaseId,
        skill.skill,
        String(skill.orderIndex),
      ),
    );

    return { createdSkills, skillMap };
  }

  /**
   * Insert skill options; strip `subpath` from DB columns (not a table field).
   * Returns readySubpaths = options where generateRoadmapV2 already embedded
   * a full AISubpathResult — those can be persisted without another AI call.
   */
  private async createSkillOptionsFromPreview(params: {
    roadmapId: string;
    phases: Array<{
      name: string;
      skills: RoadmapSkillData[];
    }>;
    phaseMap: Record<string, { id: string }>;
    skillMap: Record<string, { id: string }>;
  }) {
    const { roadmapId, phases, phaseMap, skillMap } = params;
    const skillIdMap = new Map<string, string>();

    const newSkillOptions = phases.flatMap((phase, phaseIndex) =>
      (phase.skills || []).flatMap((skill, skillIndex) => {
        const matchedPhase =
          phaseMap[
            this.buildPrimaryKey(roadmapId, phase.name, String(phaseIndex))
          ];
        const matchedSkill =
          skillMap[
            this.buildPrimaryKey(
              matchedPhase.id,
              skill.skill,
              String(skillIndex),
            )
          ];

        if (skill.skillId) {
          skillIdMap.set(skill.skillId, matchedSkill.id);
        }

        return (skill.options || []).map((option: SkillOption) => ({
          roadmapSkillId: matchedSkill.id,
          optionId: option.optionId,
          optionName: option.optionName ?? "",
          resources: option.resources || [],
          keyConcepts: option.keyConcepts || [],
          subpath: option.subpath,
        }));
      }),
    );

    const createdOptions = await this.skillOptionRepository.createMany(
      // Persist option metadata only — subpath JSON is handled separately
      newSkillOptions.map(({ subpath: _subpath, ...rest }) => rest),
    );

    const optionIdToDbId = new Map(
      createdOptions.map((row) => [row.optionId, row.id]),
    );

    // Options that already carry subpath content from the roadmap AI response
    const readySubpaths = newSkillOptions
      .filter((o) => o.subpath && optionIdToDbId.has(o.optionId))
      .map((o) => ({
        roadmapSkillOptionId: optionIdToDbId.get(o.optionId)!,
        optionName: o.optionName,
        subpath: o.subpath!,
      }));

    return { readySubpaths, skillIdMap };
  }

  private async mapSkillPrerequisites(params: {
    phases: Array<{ skills: RoadmapSkillData[] }>;
    skillIdMap: Map<string, string>;
  }) {
    const { phases, skillIdMap } = params;

    for (const phase of phases) {
      for (const skillData of phase.skills || []) {
        const aiSkillId = skillData.skillId;
        if (!skillData.prerequisites?.length || !aiSkillId) continue;

        const dbSkillId = skillIdMap.get(aiSkillId);
        if (!dbSkillId) continue;

        const mappedPrerequisites = skillData.prerequisites
          .map((prereqSkillId: string) => {
            const mapped = skillIdMap.get(prereqSkillId);
            if (!mapped) {
              this.logger.warn(
                `[${TaskTypeEnum.LEARNING_PATH_GENERATION}] Prerequisite skillId ${prereqSkillId} not found in skillIdMap for skill ${aiSkillId}`,
              );
            }
            return mapped;
          })
          .filter((id: string | undefined): id is string => id !== undefined);

        await this.skillRepository.update(
          { id: dbSkillId },
          { prerequisites: mappedPrerequisites },
        );
      }
    }
  }

  /**
   * Persist subpaths that came embedded inside generateRoadmapV2 (`option.subpath`).
   * No AI call here — just create shared template + user snapshot.
   * Empty readySubpaths → no-op (common when AI only returns option metadata).
   */
  private async persistEagerlyGeneratedSubpaths(params: {
    userId: string;
    targetRole: string;
    currentRole: string;
    readySubpaths: Array<{
      roadmapSkillOptionId: string;
      optionName: string;
      subpath: AISubpathResult;
    }>;
  }) {
    const { userId, targetRole, currentRole, readySubpaths } = params;
    if (!readySubpaths.length) return;

    await mapWithConcurrency(
      readySubpaths,
      async ({ roadmapSkillOptionId, optionName, subpath }) => {
        await this.ensureUserSubpathForOption({
          roadmapId: "", // no WS notify on this path
          userId,
          targetRole,
          currentRole,
          option: {
            skillId: "",
            skillName: optionName,
            optionId: roadmapSkillOptionId,
            optionName,
            keyConcepts: [],
          },
          notify: false,
          aiSubpath: subpath, // reuse embedded AI payload — skip generateSubPath
        });
      },
      {
        concurrency: SUBPATH_GENERATION_CONCURRENCY,
        continueOnError: true,
      },
    );

    this.logger.log(
      `[${TaskTypeEnum.LEARNING_PATH_GENERATION}] Persisted ${readySubpaths.length} eagerly-generated subpath(s)`,
    );
  }

  private async withTaskLifecycle<TResult>(
    data: TaskData,
    taskType: TaskTypeEnum,
    messages: { inProgress: string; completed: string; failed: string },
    coreLogic: (task: Task, request: any) => Promise<TResult>,
    options?: {
      attemptsMade?: number;
      maxAttempts?: number;
    },
  ) {
    const { taskId, notificationId } = data;
    let task: Task | null = null;

    this.logger.log(
      `[${taskType}] Starting task ${taskId} with notification ${notificationId}`,
    );

    try {
      task = await this.taskRepository.get(taskId);
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      const userId = task.userId;
      const request = (task.input as any)?.request;
      if (!userId || !request) {
        throw new Error(`Task input missing userId/request: ${taskId}`);
      }

      const templateData = this.buildTaskTemplateData(taskType, request);

      await this.emitAndPersistTask({
        taskId,
        notificationId,
        userId,
        payload: { taskId },
        message: messages.inProgress,
        taskData: {
          type: taskType,
          status: TaskStatusEnum.IN_PROGRESS,
        },
        templateData,
      });

      const result = await coreLogic(task, request);
      const attempts = options?.attemptsMade ?? 1;

      await this.emitAndPersistTask({
        taskId,
        notificationId,
        userId,
        payload: { taskId },
        message: messages.completed,
        taskData: {
          type: taskType,
          status: TaskStatusEnum.COMPLETED,
          result: {
            ...(result && typeof result === "object" ? result : {}),
            attempts,
          },
        },
        templateData,
      });
    } catch (error: any) {
      const isFinalAttempt =
        (options?.attemptsMade ?? 0) + 1 >= (options?.maxAttempts ?? 1);

      if (task) {
        const request = (task.input as any)?.request;
        await this.emitAndPersistTask({
          taskId,
          notificationId,
          userId: task.userId,
          payload: { taskId },
          message: error?.message || messages.failed,
          taskData: {
            type: taskType,
            status: TaskStatusEnum.FAILED,
            error: JSON.stringify({
              message: error.message || "Unknown error",
              attempts: options?.attemptsMade,
            }),
            result: null,
          },
          templateData: this.buildTaskTemplateData(taskType, request),
        });

        const roadmapId = (task.input as any)?.roadmapId;
        if (
          taskType === TaskTypeEnum.LEARNING_PATH_GENERATION &&
          typeof roadmapId === "string" &&
          roadmapId.length > 0
        ) {
          await this.roadmapRepository.update(
            { id: roadmapId, userId: task.userId },
            {
              generationStatus: RoadmapGenerationStatusEnum.FAILED,
              updatedAt: new Date(),
            },
          );

          if (isFinalAttempt) {
            try {
              await this.featureService.releaseFeature(
                task.userId,
                FeatureCodeEnum.LEARNING_PATH,
              );
              this.logger.log(
                `[${taskType}] Released learning path quota for user ${task.userId} after failed task ${taskId}`,
              );
            } catch (releaseError: any) {
              this.logger.error(
                `[${taskType}] Failed to release learning path quota for user ${task.userId}: ${releaseError?.message || releaseError}`,
              );
            }
          }
        }
      }
      this.logger.error(
        formatTrackedErrorLog({
          worker: "task.worker",
          queue: TASK_QUEUE,
          jobId: taskId,
          jobName: taskType,
          attemptsMade: options?.attemptsMade,
          data,
          error,
        }),
      );
      throw error;
    }
  }

  private buildTaskTemplateData(
    taskType: TaskTypeEnum,
    request: Record<string, any> | null | undefined,
  ): Record<string, any> {
    if (
      taskType === TaskTypeEnum.LEARNING_PATH_GENERATION &&
      request?.targetRole
    ) {
      return { targetRole: request.targetRole };
    }

    return {};
  }

  private async processLearningPath(
    data: TaskData,
    options?: { attemptsMade?: number; maxAttempts?: number },
  ) {
    const isFinalAttempt =
      (options?.attemptsMade ?? 0) + 1 >= (options?.maxAttempts ?? 1);

    return this.withTaskLifecycle(
      data,
      TaskTypeEnum.LEARNING_PATH_GENERATION,
      {
        inProgress: "Đang tạo lộ trình học tập của bạn...",
        completed: "Lộ trình học tập của bạn đã sẵn sàng.",
        failed: isFinalAttempt
          ? "Đã gặp sự cố khi tạo lộ trình, vui lòng thử lại sau."
          : "Đang gặp sự cố khi tạo lộ trình, hệ thống sẽ thử lại...",
      },
      async (task, request: PreviewRoadmapDto) => {
        const sourceLanguage =
          (task.input as any)?.sourceLanguage || DEFAULT_LANGUAGE_CODE;
        const roadmapId = (task.input as any)?.roadmapId;

        if (!roadmapId || typeof roadmapId !== "string") {
          throw new Error(
            `Task input missing roadmapId for learning path generation: ${task.id}`,
          );
        }

        const roadmapRequest = {
          currentRole: request.currentRole,
          targetRole: request.targetRole,
          timeCommitmentHoursPerWeek: request.timeCommitmentHoursPerWeek,
          currentSkills: request.currentSkills,
          language: sourceLanguage as "vi" | "en",
        };

        // Step A — AI generates the full roadmap JSON (may include option.subpath)
        const resultData =
          await this.aiService.generateRoadmapV2(roadmapRequest);

        // Step B — write roadmap tables + any embedded subpaths
        const roadmap = await this.persistRoadmapFromPreview({
          roadmapId,
          userId: task.userId,
          request,
          result: resultData,
          sourceLanguage,
        });

        // Step C — ensure EVERY option has a user snapshot (AI call if still missing)
        await this.generateAllSubpathsForRoadmap({
          roadmapId: roadmap.id,
          userId: task.userId,
          targetRole: roadmap.targetRole ?? "",
          currentRole: roadmap.currentRole ?? "",
        });

        const elapsedMs = Date.now() - new Date(task.createdAt).getTime();
        this.logger.log(
          `[${TaskTypeEnum.LEARNING_PATH_GENERATION}] Task ${task.id} completed in ${elapsedMs}ms (${(elapsedMs / 1000).toFixed(1)}s) — now - createdAt`,
        );

        return { roadmapId: roadmap.id, data: resultData };
      },
      options,
    );
  }

  private async processOptimizeCv(
    data: TaskData,
    options?: { attemptsMade?: number; maxAttempts?: number },
  ) {
    return this.withTaskLifecycle(
      data,
      TaskTypeEnum.CV_GENERATION,
      {
        inProgress: "Đang tối ưu CV của bạn...",
        completed: "CV của bạn đã được tối ưu.",
        failed:
          options?.attemptsMade === options?.maxAttempts
            ? "Đã gặp sự cố khi tối ưu CV, vui lòng thử lại sau."
            : "Đang gặp sự cố khi tối ưu CV, hệ thống sẽ thử lại...",
      },
      async (task, request: OptimizeAtsRequest) => {
        const result: OptimizeAtsResponse =
          await this.aiService.optimizeCvAts(request);

        // Auto-save the optimized CV
        const title =
          result.cvData?.targetJobTitle ||
          `CV tối ưu - ${new Date().toLocaleDateString("vi-VN")}`;

        const aiCvData: NewAiCv = {
          userId: task.userId,
          title,
          targetJobTitle: result.cvData?.targetJobTitle || null,
          cvData: result.cvData,
          atsScore: result.atsScore,
          matchingSkills: result.matchingSkills || [],
          missingSkills: result.missingSkills || [],
          recommendation: result.recommendation || null,
          jobDescription: request.jobDescription || null,
          language: request.language || CvLanguageEnum.VIETNAMESE,
          isFavorite: false,
          originalCvUrl: request.originalCvUrl ?? null,
          oldRawText: request.oldRawText ?? null,
        };

        const savedCv = await this.aiCvRepository.create(aiCvData);

        this.logger.log(
          `[${TaskTypeEnum.CV_GENERATION}] Auto-saved optimized CV ${savedCv.id} for user ${task.userId}`,
        );

        return { data: result, aiCvId: savedCv.id };
      },
      options,
    );
  }

  private async processOptimizeCvV2(
    data: TaskData,
    options?: { attemptsMade?: number; maxAttempts?: number },
  ) {
    return this.withTaskLifecycle(
      data,
      TaskTypeEnum.CV_GENERATION_V2,
      {
        inProgress: "Đang tối ưu CV của bạn...",
        completed: "CV của bạn đã được tối ưu.",
        failed:
          options?.attemptsMade === options?.maxAttempts
            ? "Đã gặp sự cố khi tối ưu CV, vui lòng thử lại sau."
            : "Đang gặp sự cố khi tối ưu CV, hệ thống sẽ thử lại...",
      },
      async (task, request: OptimizeAtsRequest) => {
        const result: OptimizeAtsResponseV2 =
          await this.aiService.optimizeCvAtsV2(request);

        const res = result as any;
        const cvData = result.cvData || res.cv_data;
        const originalAtsScore =
          result.originalAtsScore ?? res.original_ats_score ?? null;
        const originalScoreBreakdown =
          result.originalScoreBreakdown || res.original_score_breakdown || null;
        const atsScore = result.atsScore ?? res.ats_score ?? null;
        const scoreBreakdown =
          result.scoreBreakdown || res.score_breakdown || null;
        const matchingSkills =
          result.matchingSkills || res.matching_skills || [];
        const missingSkills = result.missingSkills || res.missing_skills || [];
        const rawOptimizations =
          result.optimizationsApplied || res.optimizations_applied || [];

        const optimizationsApplied = rawOptimizations.map((item: any) => ({
          section: item.section,
          action: item.action,
          originalText: item.originalText ?? item.original_text ?? null,
          optimizedText: item.optimizedText ?? item.optimized_text ?? null,
          reasoning: item.reasoning,
        }));

        const title =
          cvData?.targetJobTitle ||
          `CV tối ưu - ${new Date().toLocaleDateString("vi-VN")}`;

        const aiCvData: NewAiCv = {
          userId: task.userId,
          title,
          targetJobTitle: cvData?.targetJobTitle || null,
          cvData,
          originalAtsScore,
          originalScoreBreakdown,
          atsScore,
          scoreBreakdown,
          matchingSkills,
          missingSkills,
          recommendation: result.recommendation || null,
          optimizationsApplied,
          jobDescription: request.jobDescription || null,
          language: request.language || CvLanguageEnum.VIETNAMESE,
          isFavorite: false,
          originalCvUrl: request.originalCvUrl ?? null,
          oldRawText: request.oldRawText ?? null,
        };

        const savedCv = await this.aiCvRepository.create(aiCvData);

        this.logger.log(
          `[${TaskTypeEnum.CV_GENERATION_V2}] Auto-saved optimized CV V2 ${savedCv.id} for user ${task.userId}`,
        );

        return { data: result, aiCvId: savedCv.id };
      },
      options,
    );
  }
}
