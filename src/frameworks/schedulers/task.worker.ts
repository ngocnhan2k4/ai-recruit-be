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
import { IMessageQueueService } from "@/core/abstracts/message-queue.abstract";
import { IAiCvRepository } from "@/core/abstracts/repositories/ai-cv-repository.abstract";
import {
  AILearningRoadmapResult,
  CvLanguageEnum,
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

type TaskData = {
  taskId: string;
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
    private readonly aiCvRepository: IAiCvRepository,
    private readonly messageQueueService: IMessageQueueService,
    private readonly subpathRepository: ISubpathRepository,
  ) {
    super();
  }

  async process(job: Job) {
    const runOptions = {
      attemptsMade: job.attemptsMade,
      maxAttempts: job.opts.attempts,
    };
    try {
      if (
        (job.name as TaskTypeEnum) === TaskTypeEnum.LEARNING_PATH_GENERATION
      ) {
        return this.processLearningPath(job.data as TaskData, runOptions);
      }

      if ((job.name as TaskTypeEnum) === TaskTypeEnum.CV_GENERATION) {
        return this.processOptimizeCv(job.data as TaskData, runOptions);
      }

      this.logger.warn(`[process] Unknown task job name: ${job.name}`);
    } catch (error) {
      this.logger.error(
        `[worker.task.process] Failed to process task: ${error}`,
        error.stack,
      );
      throw error;
    }
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
  }) {
    const { notificationId, userId, payload, message, taskId } = params;

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
          message,
          updatedAt: new Date(),
        },
        tx,
      );
    });

    this.webSocketGateway.sendToUser({ userId }, {
      id: notificationId,
      receiverId: userId,
      message,
      type: NotificationType.SYSTEM,
      payload,
      task: {
        id: taskId,
        ...params.taskData,
      },
    } as any);
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
    const MAX_OPTION_RETRIES = 2;

    for (let i = 0; i < allOptions.length; i += CONCURRENCY) {
      const batch = allOptions.slice(i, i + CONCURRENCY);

      await Promise.all(
        batch.map(
          async ({ skillId, skillName, optionId, optionName, keyConcepts }) => {
            const existing =
              await this.subpathRepository.findByOptionId(optionId);
            if (existing) return;

            let lastErr: Error | undefined;
            for (let attempt = 1; attempt <= MAX_OPTION_RETRIES; attempt++) {
              try {
                const aiResult = await this.aiService.generateSubPath({
                  optionName,
                  keyConcepts,
                  targetRole: params.targetRole,
                  currentRole: params.currentRole,
                });
                const shared = await this.subpathRepository.createFromAIResult(
                  {
                    optionName,
                    targetRole: params.targetRole,
                    currentRole: params.currentRole,
                  },
                  aiResult,
                );
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
                return;
              } catch (err: any) {
                lastErr = err;
                this.logger.warn(
                  `[worker] Subpath gen attempt ${attempt}/${MAX_OPTION_RETRIES} failed for "${optionName}": ${err.message}`,
                );
              }
            }

            this.logger.error(
              `[worker] Subpath gen permanently failed for "${optionName}" after ${MAX_OPTION_RETRIES} attempts: ${lastErr?.message}`,
            );
            this.webSocketGateway.sendToUser({ userId: params.userId }, {
              type: NotificationType.SKILL_READY,
              skillId,
              optionId,
              roadmapId: params.roadmapId,
              skillName,
              failed: true,
            } as any);
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
        `[worker] Verification pass: ${missing.length} options still missing snapshots — retrying`,
      );
      await Promise.all(
        missing.map(
          async ({ skillId, skillName, optionId, optionName, keyConcepts }) => {
            try {
              const aiResult = await this.aiService.generateSubPath({
                optionName,
                keyConcepts,
                targetRole: params.targetRole,
                currentRole: params.currentRole,
              });
              const shared = await this.subpathRepository.createFromAIResult(
                {
                  optionName,
                  targetRole: params.targetRole,
                  currentRole: params.currentRole,
                },
                aiResult,
              );
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
                `[worker] Verification pass recovered "${optionName}"`,
              );
            } catch (err: any) {
              this.logger.error(
                `[worker] Verification pass also failed for "${optionName}": ${err.message}`,
              );
            }
          },
        ),
      );
    }

    this.logger.log(
      `[worker] Subpath generation complete for ${allOptions.length} options in roadmap ${params.roadmapId}`,
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
  }) {
    const { userId, request, result, sourceLanguage } = data;
    const preview = result.previewData;
    const phases = preview.phases || [];

    const persisted = await this.roadmapRepository.executeWithTransaction(
      async (tx) => {
        // Step 1: Create Roadmap
        const newRoadmap = await this.roadmapRepository.create(
          {
            userId,
            title: request.targetRole,
            currentRole: request.currentRole,
            targetRole: request.targetRole,
            timeCommitmentHoursPerWeek: request.timeCommitmentHoursPerWeek,
            currentSkills: request.currentSkills,
            totalWeeks: preview.totalWeeks,
            gapAnalysis: preview.gapAnalysis,
          } as any,
          tx,
        );

        // Step 2: Build phases and create them in DB
        const newPhases = phases.map(
          (
            phase: {
              name: string;
              description: string;
              durationWeeks: number;
              orderIndex: number;
              skills: RoadmapSkillData[];
            },
            index: number,
          ) => ({
            roadmapId: newRoadmap.id,
            name: phase.name,
            description: phase.description,
            durationWeeks: phase.durationWeeks,
            orderIndex: index,
          }),
        );
        const createdPhases = await this.phaseRepository.createMany(
          newPhases,
          tx,
        );

        // Step 3: Build phase map to link
        const phaseMap = keyBy(createdPhases, (phase) =>
          this.buildPrimaryKey(
            phase.roadmapId,
            phase.name,
            String(phase.orderIndex),
          ),
        );

        // Step 4: Build skills and create them in DB
        const newSkills = phases
          .map(
            (
              phase: {
                name: string;
                description: string;
                durationWeeks: number;
                orderIndex: number;
                skills: RoadmapSkillData[];
              },
              phaseIndex: number,
            ) =>
              (phase.skills || []).map(
                (skill: RoadmapSkillData, skillIndex: number) => {
                  const phaseKey = this.buildPrimaryKey(
                    newRoadmap.id,
                    phase.name,
                    String(phaseIndex),
                  );
                  const matchedPhase = phaseMap[phaseKey];

                  return {
                    phaseId: matchedPhase.id,
                    skill: skill.skill,
                    description: skill.description,
                    weekStart: skill.weekStart,
                    weekEnd: skill.weekEnd,
                    orderIndex: skillIndex,
                    prerequisites: [],
                  };
                },
              ),
          )
          .flat();

        const createdSkills = await this.skillRepository.createMany(
          newSkills,
          tx,
        );

        // Step 5: Build skill map to link
        const skillMap = keyBy(createdSkills, (skill) =>
          this.buildPrimaryKey(
            skill.phaseId,
            skill.skill,
            String(skill.orderIndex),
          ),
        );

        const skillIdMap = new Map<string, string>();
        const newSkillOptions = phases
          .map(
            (
              phase: {
                name: string;
                description: string;
                durationWeeks: number;
                orderIndex: number;
                skills: RoadmapSkillData[];
              },
              phaseIndex: number,
            ) =>
              (phase.skills || []).map(
                (skill: RoadmapSkillData, skillIndex: number) => {
                  const phaseKey = this.buildPrimaryKey(
                    newRoadmap.id,
                    phase.name,
                    String(phaseIndex),
                  );
                  const matchedPhase = phaseMap[phaseKey];

                  const skillKey = this.buildPrimaryKey(
                    matchedPhase.id,
                    skill.skill,
                    String(skillIndex),
                  );
                  const matchedSkill = skillMap[skillKey];
                  if (skill.skillId) {
                    skillIdMap.set(skill.skillId, matchedSkill.id);
                  }

                  return (skill.options || []).map((option: SkillOption) => ({
                    roadmapSkillId: matchedSkill.id,
                    optionId: option.optionId,
                    optionName: option.optionName ?? "",
                    resources: option.resources || [],
                    keyConcepts: option.keyConcepts || [],
                  }));
                },
              ),
          )
          .flat(2);

        await this.skillOptionRepository.createMany(newSkillOptions, tx);

        for (const phase of preview.phases) {
          if (phase.skills?.length) {
            for (const skillData of phase.skills) {
              const aiSkillId = skillData.skillId;
              if (skillData.prerequisites?.length && aiSkillId) {
                const dbSkillId = skillIdMap.get(aiSkillId);
                if (dbSkillId) {
                  // Map AI skillIds to database skillIds
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
                    .filter(
                      (id: string | undefined): id is string =>
                        id !== undefined,
                    );

                  // Update skill with mapped prerequisites
                  await this.skillRepository.update(
                    { id: dbSkillId },
                    { prerequisites: mappedPrerequisites },
                    tx,
                  );
                }
              }
            }
          }
        }

        return {
          roadmap: newRoadmap,
          phaseIds: createdPhases.map((item) => item.id),
          skillIds: createdSkills.map((item) => item.id),
        };
      },
    );

    await this.enqueueRoadmapTranslationJobs({
      phaseIds: persisted.phaseIds,
      skillIds: persisted.skillIds,
      sourceLanguage,
    });

    return persisted.roadmap;
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
      });
    } catch (error: any) {
      if (task) {
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
        });
      }
      this.logger.error(
        `[${taskType}] Failed task ${taskId}: ${error}`,
        error?.stack,
      );
      throw error;
    }
  }

  private async processLearningPath(
    data: TaskData,
    options?: { attemptsMade?: number; maxAttempts?: number },
  ) {
    return this.withTaskLifecycle(
      data,
      TaskTypeEnum.LEARNING_PATH_GENERATION,
      {
        inProgress: "Đang tạo lộ trình học tập của bạn...",
        completed: "Lộ trình học tập của bạn đã sẵn sàng.",
        failed:
          options?.attemptsMade === options?.maxAttempts
            ? "Đã gặp sự cố khi tạo lộ trình, vui lòng thử lại sau."
            : "Đang gặp sự cố khi tạo lộ trình, hệ thống sẽ thử lại...",
      },
      async (task, request: PreviewRoadmapDto) => {
        const sourceLanguage =
          (task.input as any)?.sourceLanguage || DEFAULT_LANGUAGE_CODE;

        const roadmapRequest = {
          currentRole: request.currentRole,
          targetRole: request.targetRole,
          timeCommitmentHoursPerWeek: request.timeCommitmentHoursPerWeek,
          currentSkills: request.currentSkills,
          language: sourceLanguage as "vi" | "en",
        };

        const resultData =
          await this.aiService.generateRoadmapV2(roadmapRequest);

        const roadmap = await this.persistRoadmapFromPreview({
          userId: task.userId,
          request,
          result: resultData,
          sourceLanguage,
        });

        // Generate all subpaths before notifying user so content is ready on first open
        await this.generateAllSubpathsForRoadmap({
          roadmapId: roadmap.id,
          userId: task.userId,
          targetRole: roadmap.targetRole ?? "",
          currentRole: roadmap.currentRole ?? "",
        });

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
