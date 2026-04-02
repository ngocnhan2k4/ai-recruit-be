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
} from "@/core/abstracts";
import { NotificationType, TaskStatusEnum, TaskTypeEnum } from "@/core";

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

    await this.taskRepository.update({ id: taskId }, params.taskData);

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

  private async persistRoadmapFromPreview(data: {
    userId: string;
    request: any;
    preview: any;
  }) {
    const { userId, request, preview } = data;

    return this.roadmapRepository.executeWithTransaction(async (tx) => {
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

      // const newPhases = (preview.phases || []).map(
      //   (phase: any, index: number) => ({
      //     roadmapId: newRoadmap.id,
      //     name: phase.name,
      //     description: phase.description,
      //     durationWeeks: phase.durationWeeks,
      //     orderIndex: index,
      //   }),
      // );

      const skillIdMap = new Map<string, string>();
      // [TODO]: Optimize later
      for (const phase of preview.phases || []) {
        const newPhase = await this.phaseRepository.create(
          {
            roadmapId: newRoadmap.id,
            name: phase.name,
            description: phase.description,
            durationWeeks: phase.durationWeeks,
            orderIndex: (preview.phases || []).indexOf(phase),
          } as any,
          tx,
        );

        for (const skillData of phase.skills || []) {
          const newSkill = await this.skillRepository.create(
            {
              phaseId: newPhase.id,
              skill: skillData.skill,
              description: skillData.description,
              weekStart: skillData.weekStart,
              weekEnd: skillData.weekEnd,
              orderIndex: skillData.orderIndex,
              prerequisites: [],
            } as any,
            tx,
          );

          if (skillData.skillId) {
            skillIdMap.set(skillData.skillId, newSkill.id);
          }

          const optionCreates = (skillData.options || []).map(
            (option: any) => ({
              skillId: newSkill.id,
              optionId: option.optionId,
              optionName: option.optionName,
              resources: option.resources || [],
              keyConcepts: option.keyConcepts || [],
            }),
          );

          if (optionCreates.length) {
            await this.skillOptionRepository.createMany(optionCreates, tx);
          }
        }
      }

      for (const phase of preview.phases) {
        if (phase.skills?.length) {
          for (const skillData of phase.skills) {
            const aiSkillId = skillData.skillId;
            if (skillData.prerequisites?.length && aiSkillId) {
              const dbSkillId = skillIdMap.get(aiSkillId as string);
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
    let resultData: any = null;

    try {
      const task = await this.taskRepository.get(taskId);
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

      console.log("AI generation completed with result:", resultData);

      const roadmap = await this.persistRoadmapFromPreview({
        userId,
        request,
        preview: resultData,
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
      // Business-specific error handling here
      const task = await this.taskRepository.get(taskId);
      const userId = task?.userId;

      if (userId) {
        await this.emitAndPersistTask({
          taskId,
          notificationId,
          userId,
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
