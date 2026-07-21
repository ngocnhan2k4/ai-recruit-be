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
} from "@/core/abstracts";
import { INotificationService } from "@/core/abstracts/notification.abstract";
import { IMessageQueueService } from "@/core/abstracts/message-queue.abstract";
import { IAiCvRepository } from "@/core/abstracts/repositories/ai-cv-repository.abstract";
import {
  AILearningRoadmapResult,
  AISubpathResult,
  CvLanguageEnum,
  LearningRoadmapGenerationStatusEnum,
  NotificationType,
  NewAiCv,
  OptimizeAtsRequest,
  OptimizeAtsResponse,
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
  formatWorkerErrorLog,
  runJobWithContext,
} from "@/common/utils/job-context";
import { getRequestId } from "@/common/utils";

type TaskData = {
  taskId: string;
  notificationId: string;
};

type LearningPathJobData = {
  roadmapId: string;
  notificationId: string;
};

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
  ) {
    super();
  }

  async process(job: Job) {
    return runJobWithContext(job, async () => {
      const runOptions = {
        attemptsMade: job.attemptsMade,
        maxAttempts: job.opts.attempts,
      };
      try {
        if (
          (job.name as TaskTypeEnum) === TaskTypeEnum.LEARNING_PATH_GENERATION
        ) {
          return this.processLearningPath(
            job.data as LearningPathJobData,
            runOptions,
          );
        }

        if ((job.name as TaskTypeEnum) === TaskTypeEnum.CV_GENERATION) {
          return this.processOptimizeCv(job.data as TaskData, runOptions);
        }

        this.logger.warn(`[process] Unknown task job name: ${job.name}`);
      } catch (error) {
        this.logger.error(formatWorkerErrorLog("task.worker", job, error));
        throw error;
      }
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

  private async generateAllSubpathsForRoadmap(params: {
    roadmapId: string;
    userId: string;
    targetRole: string;
    currentRole: string;
  }) {
    const roadmapWithDetails =
      await this.roadmapRepository.getRoadmapWithDetails(params.roadmapId);

    if (!roadmapWithDetails) return;

    const allOptions = roadmapWithDetails.phases.flatMap((phase) =>
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

    const CONCURRENCY = 10;

    for (let i = 0; i < allOptions.length; i += CONCURRENCY) {
      const batch = allOptions.slice(i, i + CONCURRENCY);

      await Promise.all(
        batch.map(
          async ({ skillId, skillName, optionId, optionName, keyConcepts }) => {
            const existing =
              await this.subpathRepository.findByOptionId(optionId);
            if (existing) return;

            try {
              let shared = await this.subpathRepository.findSharedByNaturalKey({
                optionName,
                targetRole: params.targetRole,
                currentRole: params.currentRole,
              });
              if (!shared) {
                const aiResult = await this.aiService.generateSubPath({
                  optionName,
                  keyConcepts,
                  targetRole: params.targetRole,
                  currentRole: params.currentRole,
                });
                shared = await this.subpathRepository.createFromAIResult(
                  {
                    optionName,
                    targetRole: params.targetRole,
                    currentRole: params.currentRole,
                  },
                  aiResult,
                );
              }
              await this.subpathRepository.cloneSharedSubpathForUser(
                shared.id,
                optionId,
                params.userId,
              );
              this.webSocketGateway.sendToUser({ userId: params.userId }, {
                type: NotificationType.SKILL_READY,
                skillId,
                optionId,
                roadmapId: params.roadmapId,
                skillName,
                failed: false,
              } as any);
            } catch (err: any) {
              this.logger.error(
                `[task.worker] Subpath gen failed for "${optionName}": ${err.message}`,
              );
              this.webSocketGateway.sendToUser({ userId: params.userId }, {
                type: NotificationType.SKILL_READY,
                skillId,
                optionId,
                roadmapId: params.roadmapId,
                skillName,
                failed: true,
              } as any);
            }
          },
        ),
      );
    }

    const missing = (
      await Promise.all(
        allOptions.map(async (o) => {
          const exists = await this.subpathRepository.findByOptionId(
            o.optionId,
          );
          return exists ? null : o;
        }),
      )
    ).filter(Boolean) as typeof allOptions;

    if (missing.length > 0) {
      this.logger.warn(
        `[task.worker] Verification pass: ${missing.length} options still missing snapshots — retrying`,
      );
      await Promise.all(
        missing.map(
          async ({ skillId, skillName, optionId, optionName, keyConcepts }) => {
            try {
              let shared = await this.subpathRepository.findSharedByNaturalKey({
                optionName,
                targetRole: params.targetRole,
                currentRole: params.currentRole,
              });
              if (!shared) {
                const aiResult = await this.aiService.generateSubPath({
                  optionName,
                  keyConcepts,
                  targetRole: params.targetRole,
                  currentRole: params.currentRole,
                });
                shared = await this.subpathRepository.createFromAIResult(
                  {
                    optionName,
                    targetRole: params.targetRole,
                    currentRole: params.currentRole,
                  },
                  aiResult,
                );
              }
              await this.subpathRepository.cloneSharedSubpathForUser(
                shared.id,
                optionId,
                params.userId,
              );
              this.webSocketGateway.sendToUser({ userId: params.userId }, {
                type: NotificationType.SKILL_READY,
                skillId,
                optionId,
                roadmapId: params.roadmapId,
                skillName,
                failed: false,
              } as any);
              this.logger.log(
                `[task.worker] Verification pass recovered "${optionName}"`,
              );
            } catch (err: any) {
              this.logger.error(
                `[task.worker] Verification pass also failed for "${optionName}": ${err.message}`,
              );
            }
          },
        ),
      );
    }

    this.logger.log(
      `[task.worker] Subpath generation complete for ${allOptions.length} options in roadmap ${params.roadmapId}`,
    );
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

  private async persistRoadmapFromPreview(data: {
    userId: string;
    request: PreviewRoadmapDto;
    result: AILearningRoadmapResult;
    sourceLanguage: string;
    roadmapId: string;
  }) {
    const { userId, request, result, sourceLanguage, roadmapId } = data;
    const preview = result.previewData;
    const phases = preview.phases || [];

    const persisted = await this.roadmapRepository.executeWithTransaction(
      async () => {
        const newRoadmap = await this.updateRoadmapRecord({
          userId,
          request,
          preview,
          roadmapId,
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

    await this.persistEagerlyGeneratedSubpaths({
      userId,
      targetRole: request.targetRole ?? "",
      currentRole: request.currentRole ?? "",
      readySubpaths: persisted.readySubpaths,
    });

    await this.enqueueRoadmapTranslationJobs({
      phaseIds: persisted.phaseIds,
      skillIds: persisted.skillIds,
      sourceLanguage,
    });

    return persisted.roadmap;
  }

  private async updateRoadmapRecord(params: {
    userId: string;
    request: PreviewRoadmapDto;
    preview: AILearningRoadmapResult["previewData"];
    roadmapId: string;
  }) {
    const { userId, request, preview, roadmapId } = params;
    const [updatedRoadmap] = await this.roadmapRepository.update(
      { id: roadmapId },
      {
        userId,
        title: request.targetRole,
        currentRole: request.currentRole,
        targetRole: request.targetRole,
        timeCommitmentHoursPerWeek: request.timeCommitmentHoursPerWeek,
        currentSkills: request.currentSkills,
        totalWeeks: preview.totalWeeks,
        gapAnalysis: preview.gapAnalysis,
        generationStatus: LearningRoadmapGenerationStatusEnum.FINISHED,
        generatedAt: new Date(),
        updatedAt: new Date(),
      },
    );

    if (!updatedRoadmap) {
      throw new Error(`Pending roadmap not found: ${roadmapId}`);
    }

    return updatedRoadmap;
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
      newSkillOptions.map(({ subpath: _subpath, ...rest }) => rest),
    );

    const optionIdToDbId = new Map(
      createdOptions.map((row) => [row.optionId, row.id]),
    );

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
                `[worker.task] [persistRoadmapFromPreview] Prerequisite skillId ${prereqSkillId} not found in skillIdMap for skill ${aiSkillId}`,
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

    await Promise.all(
      readySubpaths.map(
        async ({ roadmapSkillOptionId, optionName, subpath }) => {
          try {
            const shared = await this.subpathRepository.createFromAIResult(
              { optionName, targetRole, currentRole },
              subpath,
            );

            await this.subpathRepository.cloneSharedSubpathForUser(
              shared.id,
              roadmapSkillOptionId,
              userId,
            );
          } catch (err: any) {
            this.logger.error(
              `[task.worker] Failed to persist eagerly-generated subpath for "${optionName}": ${err.message}`,
            );
          }
        },
      ),
    );

    this.logger.log(
      `[task.worker] Persisted ${readySubpaths.length} eagerly-generated subpath(s)`,
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
      }
      this.logger.error(
        formatTrackedErrorLog({
          worker: "task.worker",
          requestId: getRequestId(),
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

  // [TODO]: delete this function to clear
  private mapGenerationStatusToTaskStatus(
    status: LearningRoadmapGenerationStatusEnum,
  ): TaskStatusEnum {
    switch (status) {
      case LearningRoadmapGenerationStatusEnum.PENDING:
        return TaskStatusEnum.PENDING;
      case LearningRoadmapGenerationStatusEnum.IN_PROGRESS:
        return TaskStatusEnum.IN_PROGRESS;
      case LearningRoadmapGenerationStatusEnum.FINISHED:
        return TaskStatusEnum.COMPLETED;
      case LearningRoadmapGenerationStatusEnum.FAILED:
        return TaskStatusEnum.FAILED;
      default:
        return TaskStatusEnum.PENDING;
    }
  }

  private async emitAndPersistLearningPath(params: {
    roadmapId: string;
    notificationId: string;
    userId: string;
    message: string;
    generationStatus: LearningRoadmapGenerationStatusEnum;
    metadataPatch?: {
      result?: Record<string, unknown> | null;
      error?: string | null;
    };
    templateData?: Record<string, any>;
  }) {
    const {
      roadmapId,
      notificationId,
      userId,
      message,
      generationStatus,
      metadataPatch,
      templateData,
    } = params;

    const taskStatus = this.mapGenerationStatusToTaskStatus(generationStatus);
    const template = this.resolveTaskNotificationTemplate({
      taskType: TaskTypeEnum.LEARNING_PATH_GENERATION,
      status: taskStatus,
      message,
      templateData,
    });

    const existing = await this.roadmapRepository.get(roadmapId);
    const nextMetadata = {
      ...(existing?.metadata ?? {}),
      ...(metadataPatch ?? {}),
    };

    await this.roadmapRepository.executeWithTransaction(async (tx) => {
      await this.roadmapRepository.update(
        { id: roadmapId },
        {
          generationStatus,
          metadata: nextMetadata,
          updatedAt: new Date(),
        },
        tx,
      );

      await this.notificationRepository.update(
        { id: notificationId },
        {
          payload: { roadmapId },
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
      payload: { roadmapId },
      roadmap: {
        id: roadmapId,
        generationStatus,
        result: nextMetadata.result ?? { roadmapId },
        error: nextMetadata.error ?? null,
      },
    } as any);
  }

  private async processLearningPath(
    data: LearningPathJobData,
    options?: { attemptsMade?: number; maxAttempts?: number },
  ) {
    const { roadmapId, notificationId } = data;
    const isFinalAttempt =
      (options?.attemptsMade ?? 0) + 1 >= (options?.maxAttempts ?? 1);
    const messages = {
      inProgress: "Đang tạo lộ trình học tập của bạn...",
      completed: "Lộ trình học tập của bạn đã sẵn sàng.",
      failed: isFinalAttempt
        ? "Đã gặp sự cố khi tạo lộ trình, vui lòng thử lại sau."
        : "Đang gặp sự cố khi tạo lộ trình, hệ thống sẽ thử lại...",
    };

    this.logger.log(
      `[learning_path_generation] Starting roadmap ${roadmapId} with notification ${notificationId}`,
    );

    let userId: string | null = null;
    let request: PreviewRoadmapDto | null = null;

    try {
      const roadmap = await this.roadmapRepository.get(roadmapId);
      if (!roadmap) {
        throw new Error(`Roadmap not found: ${roadmapId}`);
      }

      userId = roadmap.userId;
      request = {
        currentRole: roadmap.currentRole ?? undefined,
        targetRole: roadmap.targetRole,
        timeCommitmentHoursPerWeek: roadmap.timeCommitmentHoursPerWeek,
        currentSkills: roadmap.currentSkills ?? undefined,
      } as PreviewRoadmapDto;
      const sourceLanguage =
        roadmap.metadata?.language || DEFAULT_LANGUAGE_CODE;

      if (!userId || !request?.targetRole) {
        throw new Error(
          `Roadmap metadata missing userId/request: ${roadmapId}`,
        );
      }

      const templateData = { targetRole: request.targetRole };

      await this.emitAndPersistLearningPath({
        roadmapId,
        notificationId,
        userId,
        message: messages.inProgress,
        generationStatus: LearningRoadmapGenerationStatusEnum.IN_PROGRESS,
        templateData,
      });

      const roadmapRequest = {
        currentRole: request.currentRole,
        targetRole: request.targetRole,
        timeCommitmentHoursPerWeek: request.timeCommitmentHoursPerWeek,
        currentSkills: request.currentSkills,
        language: sourceLanguage as "vi" | "en",
      };

      const resultData = await this.aiService.generateRoadmapV2(roadmapRequest);

      const persisted = await this.persistRoadmapFromPreview({
        userId,
        request,
        result: resultData,
        sourceLanguage,
        roadmapId,
      });

      await this.generateAllSubpathsForRoadmap({
        roadmapId: persisted.id,
        userId,
        targetRole: persisted.targetRole ?? "",
        currentRole: persisted.currentRole ?? "",
      });

      const attempts = options?.attemptsMade ?? 1;
      const result = {
        roadmapId: persisted.id,
        data: resultData as unknown as Record<string, unknown>,
        attempts,
      };

      await this.emitAndPersistLearningPath({
        roadmapId,
        notificationId,
        userId,
        message: messages.completed,
        generationStatus: LearningRoadmapGenerationStatusEnum.FINISHED,
        metadataPatch: {
          result,
          error: null,
        },
        templateData,
      });

      return result;
    } catch (error: any) {
      if (userId) {
        await this.emitAndPersistLearningPath({
          roadmapId,
          notificationId,
          userId,
          message: error?.message || messages.failed,
          generationStatus: LearningRoadmapGenerationStatusEnum.FAILED,
          metadataPatch: {
            error: JSON.stringify({
              message: error?.message || "Unknown error",
              attempts: options?.attemptsMade,
            }),
            result: null,
          },
          templateData: this.buildTaskTemplateData(
            TaskTypeEnum.LEARNING_PATH_GENERATION,
            request,
          ),
        });
      }

      this.logger.error(
        formatTrackedErrorLog({
          worker: "task.worker",
          requestId: getRequestId(),
          queue: TASK_QUEUE,
          jobId: roadmapId,
          jobName: TaskTypeEnum.LEARNING_PATH_GENERATION,
          attemptsMade: options?.attemptsMade,
          data,
          error,
        }),
      );
      throw error;
    }
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
        };

        const savedCv = await this.aiCvRepository.create(aiCvData);

        this.logger.log(
          `Auto-saved optimized CV ${savedCv.id} for user ${task.userId}`,
        );

        return { data: result, aiCvId: savedCv.id };
      },
      options,
    );
  }
}
