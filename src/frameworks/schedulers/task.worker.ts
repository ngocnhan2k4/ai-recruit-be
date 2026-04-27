import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { TASK_QUEUE, TASK_EVENT } from "@/common/constants";
import {
  IAIService,
  ITaskRepository,
  IWebSocketGateway,
  ILearningRoadmapRepository,
  IRoadmapPhaseRepository,
  IRoadmapSkillRepository,
  IRoadmapSkillOptionRepository,
  INotificationRepository,
  IJobRepository,
  ISearchService,
} from "@/core/abstracts";
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

type ScoreCvApplyData = {
  applyId: string;
  jobId: string;
  cvId: string;
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
    private readonly jobRepository: IJobRepository,
    private readonly searchService: ISearchService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job) {
    if (job.name === TASK_EVENT.SCORE_CV_APPLY) {
      return this.processCvScoring(job.data as ScoreCvApplyData);
    }

    if ((job.name as TaskTypeEnum) === TaskTypeEnum.LEARNING_PATH_GENERATION) {
      return this.processLearningPath(job.data as TaskData, job.opts);
    }

    if ((job.name as TaskTypeEnum) === TaskTypeEnum.CV_GENERATION) {
      return this.processOptimizeCv(job.data as TaskData, job.opts);
    }

    this.logger.warn(`[process] Unknown task job name: ${job.name}`);
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

  private async persistRoadmapFromPreview(data: {
    userId: string;
    request: PreviewRoadmapDto;
    result: AILearningRoadmapResult;
  }) {
    const { userId, request, result } = data;
    const preview = result.previewData;
    const phases = preview.phases || [];

    return this.roadmapRepository.executeWithTransaction(async (tx) => {
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
                  optionName: option.optionName,
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
                  .map((prereqSkillId: string) => skillIdMap.get(prereqSkillId))
                  .filter(
                    (id: string | undefined): id is string => id !== undefined,
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

      return newRoadmap;
    });
  }

  private async withTaskLifecycle<TResult>(
    data: TaskData,
    taskType: TaskTypeEnum,
    messages: { inProgress: string; completed: string; failed: string },
    coreLogic: (task: Task, request: any) => Promise<TResult>,
    options?: {
      attempts?: number;
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

      await this.emitAndPersistTask({
        taskId,
        notificationId,
        userId,
        payload: { taskId },
        message: messages.completed,
        taskData: {
          type: taskType,
          status: TaskStatusEnum.COMPLETED,
          result: result || {},
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
              attempts: options?.attempts,
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
    options?: { attempts?: number },
  ) {
    return this.withTaskLifecycle(
      data,
      TaskTypeEnum.LEARNING_PATH_GENERATION,
      {
        inProgress: "Đang tạo lộ trình học tập của bạn...",
        completed: "Lộ trình học tập của bạn đã sẵn sàng.",
        failed:
          options?.attempts === MAX_TASK_ATTEMPTS
            ? "Đã gặp sự cố khi tạo lộ trình, vui lòng thử lại sau."
            : "Đang gặp sự cố khi tạo lộ trình, hệ thống sẽ thử lại...",
      },
      async (task, request: PreviewRoadmapDto) => {
        let resultData: AILearningRoadmapResult | null = null;

        const roadmapRequest = {
          currentRole: request.currentRole,
          targetRole: request.targetRole,
          timeCommitmentHoursPerWeek: request.timeCommitmentHoursPerWeek,
          currentSkills: request.currentSkills,
        };

        await new Promise<void>((resolve, reject) => {
          const subscription = this.aiService
            .generateRoadmap(roadmapRequest)
            .subscribe({
              next: (event: any) => {
                const payload = event?.data;
                if (!payload) return;

                if (payload.type === "result" && payload.data) {
                  resultData = payload.data;
                }

                if (payload.type === "error") {
                  subscription.unsubscribe();
                  reject(new Error(payload.message || "AI generation failed"));
                  return;
                }

                if (resultData) {
                  subscription.unsubscribe();
                  resolve();
                }
              },
              error: (err: any) =>
                reject(err instanceof Error ? err : new Error(String(err))),
              complete: () => resolve(),
            });
        });

        if (!resultData) {
          throw new Error("AI stream completed without result");
        }

        const roadmap = await this.persistRoadmapFromPreview({
          userId: task.userId,
          request,
          result: resultData,
        });

        return { roadmapId: roadmap.id, data: resultData };
      },
      options,
    );
  }

  private async processOptimizeCv(
    data: TaskData,
    options?: { attempts?: number },
  ) {
    return this.withTaskLifecycle(
      data,
      TaskTypeEnum.CV_GENERATION,
      {
        inProgress: "Đang tối ưu CV của bạn...",
        completed: "CV của bạn đã được tối ưu.",
        failed:
          options?.attempts === MAX_TASK_ATTEMPTS
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

  private async processCvScoring(data: ScoreCvApplyData): Promise<void> {
    const { applyId, jobId, cvId } = data;
    this.logger.log(`[processCvScoring] start applyId=${applyId}`);

    const cvIndex = this.configService.get<string>("ELASTICSEARCH_INDEX_CVS")!;
    const jobIndex = this.configService.get<string>(
      "ELASTICSEARCH_INDEX_JOBS",
    )!;

    const [cvResult, jobResult] = await Promise.all([
      this.searchService.search(cvIndex, {
        query: { ids: { values: [cvId] } },
        size: 1,
      }),
      this.searchService.search(jobIndex, {
        query: { ids: { values: [jobId] } },
        size: 1,
      }),
    ]);

    const cvDoc = cvResult?.hits?.hits?.[0]?._source ?? null;
    const jobDoc = jobResult?.hits?.hits?.[0]?._source ?? null;

    if (!cvDoc) {
      throw new Error(`CV ${cvId} not indexed in ES after 15s`);
    }
    if (!jobDoc) {
      throw new Error(`Job ${jobId} not found in ES`);
    }

    const { score, criteria } = this.calculateMatchingScore(cvDoc, jobDoc);

    await this.jobRepository.executeWithTransaction(async () => {
      await this.jobRepository.updateMatchingScore(applyId, score, criteria);
      await this.jobRepository.recalculateRanks(jobId);
    });

    this.logger.log(
      `[processCvScoring] done applyId=${applyId} score=${score.toFixed(2)}`,
    );
  }

  private calculateMatchingScore(
    cv: Record<string, any>,
    job: Record<string, any>,
  ): { score: number; criteria: Record<string, any> } {
    // Skill match (40%)
    const cvSkills: string[] = cv.skillIds || [];
    const jobSkills: string[] = job.skillIds || [];
    let skillScore = 0;
    if (jobSkills.length > 0) {
      const matched = cvSkills.filter((s) => jobSkills.includes(s)).length;
      skillScore = matched / jobSkills.length;
    }

    // Experience match (25%)
    const expYears: number = cv.experienceYears ?? 0;
    const expMin: number = job.experienceMin ?? 0;
    const expMax: number = job.experienceMax ?? expMin;
    let experienceScore = 0;
    if (expYears >= expMax) {
      experienceScore = 1.0;
    } else if (expYears >= expMin) {
      experienceScore = 0.8;
    } else if (expMin > 0 && expYears >= expMin * 0.7) {
      experienceScore = 0.5;
    } else {
      experienceScore = 0.2;
    }

    // Location match (15%)
    const cvProvinces: string[] = cv.provinceIds || [];
    const jobProvinces: string[] = job.provinceIds || [];
    const locationScore =
      jobProvinces.length === 0 ||
      cvProvinces.some((p) => jobProvinces.includes(p))
        ? 1.0
        : 0.0;

    // Category match (10%)
    const cvCategories: string[] = cv.categoryIds || [];
    const jobCategoryId: string = job.categoryId || "";
    let categoryScore = 0;
    if (jobCategoryId) {
      categoryScore = cvCategories.includes(jobCategoryId) ? 1.0 : 0.0;
    }

    // Salary match (10%)
    const expectedSalary: number | null = cv.expectedSalary ?? null;
    const salaryMax: number | null = job.salaryMax ?? null;
    let salaryScore = 1.0;
    if (expectedSalary !== null && salaryMax !== null) {
      if (expectedSalary <= salaryMax * 1.2) {
        salaryScore = 1.0;
      } else if (expectedSalary <= salaryMax * 1.5) {
        salaryScore = 0.7;
      } else {
        salaryScore = 0.3;
      }
    }

    const score =
      skillScore * 0.4 +
      experienceScore * 0.25 +
      locationScore * 0.15 +
      categoryScore * 0.1 +
      salaryScore * 0.1;

    const criteria = {
      skill: { score: skillScore, weight: 0.4 },
      experience: { score: experienceScore, weight: 0.25 },
      location: { score: locationScore, weight: 0.15 },
      category: { score: categoryScore, weight: 0.1 },
      salary: { score: salaryScore, weight: 0.1 },
    };

    return { score: Math.min(score * 100, 100), criteria };
  }
}
