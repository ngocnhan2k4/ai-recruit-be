import { Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { TASK_QUEUE } from "@/common/constants";
import {
  IAIService,
  ITaskRepository,
  IWebSocketGateway,
  ILearningRoadmapRepository,
  IRoadmapPhaseRepository,
  IRoadmapSkillRepository,
  IRoadmapSkillOptionRepository,
  INotificationRepository,
} from "@/core/abstracts";
import {
  AILearningRoadmapResult,
  NotificationType,
  RoadmapSkillData,
  SkillOption,
  Task,
  TaskStatusEnum,
  TaskTypeEnum,
} from "@/core";
import { PreviewRoadmapDto } from "@/interfaces/dtos";
import { keyBy } from "lodash";

type LearningPathTaskData = {
  taskId: string;
  notificationId: string;
};

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
  ) {
    super();
  }

  async process(job: Job) {
    if ((job.name as TaskTypeEnum) === TaskTypeEnum.LEARNING_PATH_GENERATION) {
      return this.processLearningPath(job.data as LearningPathTaskData);
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
      progress: number;
      result?: Record<string, any> | null;
      error?: string | null;
    };
  }) {
    const { notificationId, userId, payload, message, taskId } = params;

    await this.taskRepository.executeWithTransaction(async (tx) => {
      await this.taskRepository.update({ id: taskId }, params.taskData, tx);

      await this.notificationRepository.update(
        { id: notificationId },
        {
          payload: {
            taskId,
            ...payload,
          },
          message,
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

  private async processLearningPath(data: LearningPathTaskData) {
    const { taskId, notificationId } = data;
    let resultData: AILearningRoadmapResult | null = null;
    let task: Task | null = null;

    try {
      task = await this.taskRepository.get(taskId);
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      const userId = task.userId;
      const request: PreviewRoadmapDto = (task.input as any)?.request;
      if (!userId || !request) {
        throw new Error(`Task input missing userId/request: ${taskId}`);
      }

      await this.emitAndPersistTask({
        taskId,
        notificationId,
        userId,
        payload: { taskId },
        message: "Đang tạo lộ trình học tập của bạn...",
        taskData: {
          type: TaskTypeEnum.LEARNING_PATH_GENERATION,
          status: TaskStatusEnum.IN_PROGRESS,
          progress: 0,
        },
      });

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
              const onNext = async () => {
                const payload = event?.data;
                if (!payload) return;

                if (payload.type === "result" && payload.data) {
                  resultData = payload.data;
                }

                if (payload.type === "error") {
                  this.logger.error(
                    `[processLearningPath] AI generation error for task ${taskId}: ${payload}`,
                  );
                  subscription.unsubscribe();
                  reject(new Error(payload.message || "AI generation failed"));
                  return;
                }

                // Keep task progress updated if AI provides it; otherwise keep 0 until completion.
                const progress =
                  typeof payload.progress === "number"
                    ? Math.max(0, Math.min(100, Math.floor(payload.progress)))
                    : undefined;

                await this.emitAndPersistTask({
                  taskId,
                  notificationId,
                  userId,
                  payload: { taskId },
                  message: "Đang tạo lộ trình học tập của bạn...",
                  taskData: {
                    type: TaskTypeEnum.LEARNING_PATH_GENERATION,
                    status: TaskStatusEnum.IN_PROGRESS,
                    ...(typeof progress === "number"
                      ? { progress }
                      : { progress: 0 }),
                  },
                });

                if (resultData) {
                  subscription.unsubscribe();
                  resolve();
                }
              };

              void onNext().catch((err) => {
                subscription.unsubscribe();
                reject(err instanceof Error ? err : new Error(String(err)));
              });
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
        userId,
        request,
        result: resultData,
      });

      await this.emitAndPersistTask({
        taskId,
        notificationId,
        userId,
        payload: {
          taskId,
        },
        message: "Lộ trình học tập của bạn đã sẵn sàng.",
        taskData: {
          type: TaskTypeEnum.LEARNING_PATH_GENERATION,
          status: TaskStatusEnum.COMPLETED,
          progress: 100,
          result: { roadmapId: roadmap.id, data: resultData },
        },
      });
    } catch (error: any) {
      if (task) {
        await this.emitAndPersistTask({
          taskId,
          notificationId,
          userId: task.userId,
          payload: {
            taskId,
          },
          message: error?.message || "Failed to generate learning roadmap",
          taskData: {
            type: TaskTypeEnum.LEARNING_PATH_GENERATION,
            status: TaskStatusEnum.FAILED,
            progress: 0,
            error: error.message || "Unknown error",
            result: { data: resultData },
          },
        });
      }
      this.logger.error(
        `[processLearningPath] Failed task ${taskId}: ${error}`,
        error?.stack,
      );
      throw error;
    }
  }
}
