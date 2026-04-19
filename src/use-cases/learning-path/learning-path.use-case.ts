import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import {
  ILearningRoadmapRepository,
  IRoadmapPhaseRepository,
  IRoadmapSkillRepository,
  IRoadmapSkillOptionRepository,
  IWeeklyProgressRepository,
  ITaskRepository,
  INotificationRepository,
  IWebSocketGateway,
  IFeatureService,
} from "@/core/abstracts";
import { IMessageQueueService } from "@/core/abstracts/message-queue.abstract";
import {
  PreviewRoadmapDto,
  GetRoadmapsQueryDto,
  RoadmapProgressStatsDto,
  WeeklyProgressResponseDto,
} from "@/interfaces/dtos/learning-path";
import { ApiResponse, PaginatedResultDto } from "@/interfaces/dtos";
import { RESPONSE_CODE } from "@/common/constants";
import {
  FeatureCodeEnum,
  LearningRoadmap,
  LearningRoadmapWithDetails,
  WeeklyProgress,
  NotificationType,
  TaskTypeEnum,
  TaskStatusEnum,
} from "@/core";
import { getCurrentWeekNumber, JitterBackoff, retry } from "@/common/utils";

@Injectable()
export class LearningPathUseCase {
  private readonly logger = new Logger(LearningPathUseCase.name);

  constructor(
    private readonly roadmapRepository: ILearningRoadmapRepository,
    private readonly phaseRepository: IRoadmapPhaseRepository,
    private readonly skillRepository: IRoadmapSkillRepository,
    private readonly skillOptionRepository: IRoadmapSkillOptionRepository,
    private readonly weeklyProgressRepository: IWeeklyProgressRepository,
    private readonly taskRepository: ITaskRepository,
    private readonly notificationRepository: INotificationRepository,
    private readonly webSocketGateway: IWebSocketGateway,
    private readonly messageQueueService: IMessageQueueService,
    private readonly featureService: IFeatureService,
  ) {}

  async createRoadmap(
    request: PreviewRoadmapDto,
    userId: string,
  ): Promise<ApiResponse<{ taskId: string }>> {
    this.logger.log(
      `Previewing roadmap for target role: ${request.targetRole}`,
    );

    const result = await this.taskRepository.executeWithTransaction(
      async (tx) => {
        await this.featureService.consumeFeature(
          userId,
          FeatureCodeEnum.LEARNING_PATH,
        );

        const task = await this.taskRepository.create(
          {
            name: `Learning path generation: ${request.targetRole}`,
            type: TaskTypeEnum.LEARNING_PATH_GENERATION,
            status: TaskStatusEnum.PENDING,
            userId,
            input: {
              request,
            },
          },
          tx,
        );

        const [notification] =
          await this.notificationRepository.createNotificationWithRecipients(
            {
              senderId: null,
              title: "Lộ trình học tập của bạn đang được tạo",
              message:
                "Đang tạo lộ trình học tập dựa trên vai trò mục tiêu của bạn. Vui lòng chờ trong giây lát!",
              type: NotificationType.SYSTEM,
              payload: {
                taskId: task.id,
              },
            },
            [{ receiverId: userId }],
          );
        return {
          task,
          notification,
        };
      },
    );

    // Emit the created notification once (only notification record)
    this.webSocketGateway.sendToUser({ userId }, result.notification);

    // [TODO] Implement outbox pattern to ensure message queue is reliable
    await retry(
      async () => {
        await this.messageQueueService.addTask(
          TaskTypeEnum.LEARNING_PATH_GENERATION,
          {
            taskId: result.task.id,
            notificationId: result.notification.id,
          },
          {
            jobId: `task.async:${result.task.id}`,
          },
        );
        this.logger.log(
          `Learning path generation task added to message queue: ${result.task.id}`,
        );
      },
      {
        retries: 3,
        backoff: new JitterBackoff(1000, 10000),
      },
    );

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: "Learning path generation started",
      data: { taskId: result.task.id },
    };
  }

  // async saveRoadmap(
  //   userId: string,
  //   dto: SaveRoadmapDto,
  // ): Promise<ApiResponse<LearningRoadmap>> {
  //   this.logger.log(`Saving roadmap for user ${userId}`);

  //   const preview = dto.previewData;
  //   const roadmap = await this.roadmapRepository.executeWithTransaction(
  //     async (tx) => {
  //       const newRoadmap = await this.roadmapRepository.create(
  //         {
  //           userId,
  //           title: dto.title,
  //           currentRole: dto.currentRole,
  //           targetRole: dto.targetRole,
  //           timeCommitmentHoursPerWeek: dto.timeCommitmentHoursPerWeek,
  //           currentSkills: dto.currentSkills,
  //           totalWeeks: preview.totalWeeks,
  //           gapAnalysis: preview.gapAnalysis,
  //         },
  //         tx,
  //       );

  //       const skillIdMap = new Map<string, string>();

  //       for (const phase of preview.phases) {
  //         const newPhase = await this.phaseRepository.create(
  //           {
  //             roadmapId: newRoadmap.id,
  //             name: phase.name,
  //             description: phase.description,
  //             durationWeeks: phase.durationWeeks,
  //             orderIndex: preview.phases.indexOf(phase),
  //           },
  //           tx,
  //         );

  //         if (phase.skills?.length) {
  //           for (const skillData of phase.skills) {
  //             const newSkill = await this.skillRepository.create(
  //               {
  //                 phaseId: newPhase.id,
  //                 skill: skillData.skill,
  //                 description: skillData.description,
  //                 weekStart: skillData.weekStart,
  //                 weekEnd: skillData.weekEnd,
  //                 orderIndex: skillData.orderIndex,
  //                 prerequisites: [],
  //               },
  //               tx,
  //             );

  //             const aiSkillId = skillData.skillId;
  //             if (aiSkillId) {
  //               skillIdMap.set(aiSkillId as string, newSkill.id);
  //             }

  //             if (skillData.options?.length) {
  //               const optionCreates = skillData.options.map(
  //                 (option: {
  //                   optionId: string;
  //                   optionName: string;
  //                   resources: any[];
  //                   keyConcepts: string[];
  //                 }) => ({
  //                   roadmapSkillId: newSkill.id,
  //                   optionId: option.optionId,
  //                   optionName: option.optionName,
  //                   resources: option.resources,
  //                   keyConcepts: option.keyConcepts,
  //                 }),
  //               );

  //               await this.skillOptionRepository.createManyOptions(
  //                 optionCreates as RoadmapSkillOption[],
  //                 tx,
  //               );
  //             }
  //           }
  //         }
  //       }

  //       for (const phase of preview.phases) {
  //         if (phase.skills?.length) {
  //           for (const skillData of phase.skills) {
  //             const aiSkillId = skillData.skillId;
  //             if (skillData.prerequisites?.length && aiSkillId) {
  //               const dbSkillId = skillIdMap.get(aiSkillId as string);
  //               if (dbSkillId) {
  //                 // Map AI skillIds to database skillIds
  //                 const mappedPrerequisites = skillData.prerequisites
  //                   .map((prereqSkillId: string) =>
  //                     skillIdMap.get(prereqSkillId),
  //                   )
  //                   .filter(
  //                     (id: string | undefined): id is string =>
  //                       id !== undefined,
  //                   );

  //                 // Update skill with mapped prerequisites
  //                 await this.skillRepository.update(
  //                   { id: dbSkillId },
  //                   { prerequisites: mappedPrerequisites },
  //                   tx,
  //                 );
  //               }
  //             }
  //           }
  //         }
  //       }

  //       return newRoadmap;
  //     },
  //   );

  //   this.logger.log(`Roadmap saved successfully: ${roadmap.id}`);

  //   return {
  //     data: roadmap,
  //     message: "Roadmap saved successfully",
  //     code: RESPONSE_CODE.SUCCESS,
  //   };
  // }

  async getRoadmaps(
    userId: string,
    query: GetRoadmapsQueryDto,
  ): Promise<ApiResponse<PaginatedResultDto<LearningRoadmap>>> {
    this.logger.log(`Fetching roadmaps for user ${userId}`);

    const data = await this.roadmapRepository.getPaginatedRoadmaps({
      ...query,
      userId,
    });

    return {
      data,
      message: "Roadmaps fetched successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async getRoadmapDetails(
    roadmapId: string,
    userId: string,
  ): Promise<ApiResponse<LearningRoadmapWithDetails>> {
    this.logger.log(`Fetching roadmap details: ${roadmapId}`);

    const roadmap =
      await this.roadmapRepository.getRoadmapWithDetails(roadmapId);

    if (!roadmap) {
      throw new NotFoundException({
        message: "Roadmap not found",
        code: RESPONSE_CODE.ROADMAP_NOT_FOUND,
      });
    }

    if (roadmap.userId !== userId) {
      throw new NotFoundException({
        message: "Roadmap not found",
        code: RESPONSE_CODE.ROADMAP_NOT_FOUND,
      });
    }

    return {
      data: roadmap,
      message: "Roadmap details fetched successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async deleteRoadmap(
    roadmapId: string,
    userId: string,
  ): Promise<ApiResponse<void>> {
    this.logger.log(`Deleting roadmap: ${roadmapId}`);

    const roadmap = await this.roadmapRepository.get(roadmapId);

    if (!roadmap || roadmap.userId !== userId) {
      throw new NotFoundException({
        message: "Roadmap not found",
        code: RESPONSE_CODE.ROADMAP_NOT_FOUND,
      });
    }

    await this.roadmapRepository.delete({ id: roadmapId });

    return {
      message: "Roadmap deleted successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async completeSkill(
    roadmapId: string,
    optionId: string,
    userId: string,
  ): Promise<ApiResponse<{ unlockedSkills: string[] }>> {
    const roadmap = await this.roadmapRepository.get(roadmapId);
    if (!roadmap || roadmap.userId !== userId) {
      throw new NotFoundException({
        message: "Roadmap not found",
        code: RESPONSE_CODE.ROADMAP_NOT_FOUND,
      });
    }

    // Find the option to complete
    const roadmapDetails =
      await this.roadmapRepository.getRoadmapWithDetails(roadmapId);

    if (!roadmapDetails) {
      throw new NotFoundException({
        message: "Roadmap not found",
        code: RESPONSE_CODE.ROADMAP_NOT_FOUND,
      });
    }

    let targetOption: any = null;
    let targetSkill: any = null;
    let targetPhaseId: string | null = null;

    for (const phase of roadmapDetails.phases) {
      for (const skill of phase.skills) {
        const option = skill.options.find((opt) => opt.id === optionId);
        if (option) {
          targetOption = option;
          targetSkill = skill;
          targetPhaseId = phase.id;
          break;
        }
      }
      if (targetOption) break;
    }

    if (!targetOption || !targetSkill) {
      throw new NotFoundException({
        message: "Option not found in this roadmap",
        code: RESPONSE_CODE.SKILL_NOT_FOUND_IN_ROADMAP,
      });
    }

    if (targetOption.completedAt) {
      throw new BadRequestException({
        message: "Option is already completed",
        code: RESPONSE_CODE.BAD_REQUEST,
      });
    }

    // Check prerequisites (prerequisites are skillIds)
    const prerequisitesCompleted =
      await this.skillRepository.checkPrerequisitesCompleted(
        targetSkill.id as string,
      );

    if (!prerequisitesCompleted) {
      throw new BadRequestException({
        message: "Cannot complete option: prerequisites not met",
        code: RESPONSE_CODE.BAD_REQUEST,
      });
    }

    await this.skillOptionRepository.executeWithTransaction(async (tx) => {
      // Set startDate on first skill completion
      if (!roadmap.startDate) {
        await this.roadmapRepository.update(
          { id: roadmapId },
          { startDate: new Date() },
          tx,
        );
        roadmap.startDate = new Date();
      }

      // Mark the option as completed
      await this.skillOptionRepository.markOptionCompleted(optionId, tx);
      await this.roadmapRepository.updateProgress(roadmapId, tx);

      // Increment weekly skills count
      const currentWeek = getCurrentWeekNumber(roadmap.startDate);
      await this.weeklyProgressRepository.incrementSkillsCompleted(
        roadmapId,
        currentWeek,
        tx,
      );

      // Update phase progress and status
      if (targetPhaseId) {
        await this.phaseRepository.updatePhaseProgress(targetPhaseId, tx);
      }
    });

    const unlockedSkills =
      await this.skillRepository.getUnlockedSkills(roadmapId);
    const unlockedSkillIds = unlockedSkills.map((s) => s.id);

    this.logger.log(
      `Option completed. Unlocked ${unlockedSkillIds.length} new skills`,
    );

    return {
      data: { unlockedSkills: unlockedSkillIds },
      message: "Option completed successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async getProgressStats(
    roadmapId: string,
    userId: string,
  ): Promise<ApiResponse<RoadmapProgressStatsDto>> {
    this.logger.log(`Fetching progress stats for roadmap ${roadmapId}`);

    const roadmap = await this.roadmapRepository.get(roadmapId);
    if (!roadmap || roadmap.userId !== userId) {
      throw new NotFoundException({
        message: "Roadmap not found",
        code: RESPONSE_CODE.ROADMAP_NOT_FOUND,
      });
    }

    const stats = await this.roadmapRepository.getProgressStats(roadmapId);

    return {
      data: stats,
      message: "Progress stats fetched successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async updateWeeklyHours(
    roadmapId: string,
    weekNumber: number,
    hoursSpent: number,
    userId: string,
  ): Promise<ApiResponse<WeeklyProgress>> {
    const roadmap = await this.roadmapRepository.get(roadmapId);
    if (!roadmap || roadmap.userId !== userId) {
      throw new NotFoundException({
        message: "Roadmap not found",
        code: RESPONSE_CODE.ROADMAP_NOT_FOUND,
      });
    }

    const updated = await this.weeklyProgressRepository.updateHoursSpent(
      roadmapId,
      weekNumber,
      hoursSpent,
    );

    return {
      data: updated,
      message: "Weekly hours updated successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async getWeeklyProgress(
    roadmapId: string,
    weekNumber: number,
    userId: string,
  ): Promise<ApiResponse<WeeklyProgressResponseDto>> {
    const roadmap = await this.roadmapRepository.get(roadmapId);
    if (!roadmap || roadmap.userId !== userId) {
      throw new NotFoundException({
        message: "Roadmap not found",
        code: RESPONSE_CODE.ROADMAP_NOT_FOUND,
      });
    }

    const weeklyData =
      await this.weeklyProgressRepository.getOrCreateWeeklyProgress(
        roadmapId,
        weekNumber,
      );

    const allSkills =
      await this.skillRepository.getSkillsByRoadmapId(roadmapId);

    const scheduledSkills = await Promise.all(
      allSkills
        .filter(
          (skill) =>
            skill.weekStart <= weekNumber && skill.weekEnd >= weekNumber,
        )
        .map(async (skill) => {
          const options = await this.skillOptionRepository.getOptionsBySkillId(
            skill.id,
          );
          const isCompleted = options.some((opt) => opt.completedAt !== null);

          return {
            skillId: skill.id,
            skillName: skill.skill,
            isCompleted,
          };
        }),
    );

    return {
      data: {
        weekNumber: weeklyData.weekNumber,
        hoursSpent: parseFloat(weeklyData.hoursSpent),
        skillsCompletedThisWeek: weeklyData.skillsCompletedThisWeek,
        targetHours: roadmap.timeCommitmentHoursPerWeek,
        scheduledSkills,
      },
      message: "Weekly progress retrieved successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }
}
