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
  ISkillNoteRepository,
  ISubpathRepository,
  IOptionResourceCompletionRepository,
  ISubpathModuleQuizResultRepository,
} from "@/core/abstracts";
import { IMessageQueueService } from "@/core/abstracts/message-queue.abstract";
import { IAIService } from "@/core/abstracts/ai-services.abstract";
import {
  PreviewRoadmapDto,
  GetRoadmapsQueryDto,
  RoadmapProgressStatsDto,
  WeeklyProgressResponseDto,
  UpsertSkillNoteDto,
  SkillNoteDto,
  SkillNoteForStudyGuideDto,
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
  SubpathWithDetails,
  SubpathModuleQuizResult,
} from "@/core";
import {
  getCurrentWeekNumber,
  JitterBackoff,
  normalizeLanguageCode,
  retry,
} from "@/common/utils";

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
    private readonly skillNoteRepository: ISkillNoteRepository,
    private readonly subpathRepository: ISubpathRepository,
    private readonly resourceCompletionRepository: IOptionResourceCompletionRepository,
    private readonly quizResultRepository: ISubpathModuleQuizResultRepository,
    private readonly aiService: IAIService,
  ) {}

  async getOrGenerateSubPath(
    roadmapId: string,
    optionId: string,
    userId: string,
  ): Promise<ApiResponse<SubpathWithDetails>> {
    // Lightweight ownership check (B8: no full getRoadmapWithDetails here)
    const roadmap = await this.roadmapRepository.get(roadmapId);
    if (!roadmap || roadmap.userId !== userId) {
      throw new NotFoundException({
        message: "Roadmap not found",
        code: RESPONSE_CODE.ROADMAP_NOT_FOUND,
      });
    }

    // Single JOIN query: option + skill + phase (B8)
    const optionCtx =
      await this.skillOptionRepository.findOptionWithSkillAndPhase(optionId);
    if (!optionCtx) {
      throw new NotFoundException({
        message: "Option not found in this roadmap",
        code: RESPONSE_CODE.SKILL_NOT_FOUND_IN_ROADMAP,
      });
    }

    const { option } = optionCtx;
    const optionName = (option as any).optionName as string;
    const targetRole = roadmap.targetRole ?? "";
    const currentRole = roadmap.currentRole ?? "";

    let subpath = await this.subpathRepository.findByKey(
      optionName,
      targetRole,
      currentRole,
    );

    if (!subpath) {
      this.logger.log(`Generating subpath for option ${optionName}`);
      const aiResult = await this.aiService.generateSubPath({
        optionName,
        optionReason: (option as any).reason,
        keyConcepts: option.keyConcepts ?? [],
        targetRole,
        currentRole,
      });
      subpath = await this.subpathRepository.createFromAIResult(
        { optionName, targetRole, currentRole },
        aiResult,
      );
    }

    // Collect IDs scoped to this subpath
    const subpathResourceIds = subpath.subNodes.flatMap((node) =>
      node.resources.map((r) => r.id),
    );
    const subpathModuleIds = subpath.subNodes.map((node) => node.id);

    // B7: fetch only completions for resources in this subpath, not all user completions
    const [completions, quizResults] = await Promise.all([
      subpathResourceIds.length > 0
        ? this.resourceCompletionRepository.getManyByFields(
            userId,
            subpathResourceIds,
          )
        : Promise.resolve([]),
      this.quizResultRepository.getByField({ userId }),
    ]);

    const completedResourceIds = completions.map((c) => c.resourceId);
    const subpathModuleIdSet = new Set(subpathModuleIds);
    const masteredModuleIds = quizResults
      .filter((q) => subpathModuleIdSet.has(q.moduleId) && q.passed)
      .map((q) => q.moduleId);

    return {
      data: { ...subpath, completedResourceIds, masteredModuleIds },
      message: "Subpath fetched successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  /** Toggle a resource as completed/uncompleted for the current user */
  async toggleResourceCompletion(
    roadmapId: string,
    resourceId: string,
    userId: string,
  ): Promise<ApiResponse<{ completed: boolean }>> {
    const roadmap = await this.roadmapRepository.get(roadmapId);
    if (!roadmap || roadmap.userId !== userId) {
      throw new NotFoundException({
        message: "Roadmap not found",
        code: RESPONSE_CODE.ROADMAP_NOT_FOUND,
      });
    }

    const result = await this.resourceCompletionRepository.toggleCompletion(
      userId,
      resourceId,
    );

    return {
      data: result,
      message: result.completed
        ? "Resource marked as completed"
        : "Resource marked as incomplete",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  /** Save quiz result for a module */
  async saveModuleQuizResult(
    roadmapId: string,
    moduleId: string,
    score: number,
    totalQuestions: number,
    userId: string,
  ): Promise<ApiResponse<SubpathModuleQuizResult>> {
    const roadmap = await this.roadmapRepository.get(roadmapId);
    if (!roadmap || roadmap.userId !== userId) {
      throw new NotFoundException({
        message: "Roadmap not found",
        code: RESPONSE_CODE.ROADMAP_NOT_FOUND,
      });
    }

    const result = await this.quizResultRepository.upsert(
      userId,
      moduleId,
      score,
      totalQuestions,
    );

    return {
      data: result,
      message: "Quiz result saved successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async createRoadmap(
    request: PreviewRoadmapDto,
    userId: string,
    requestLanguage?: string,
  ): Promise<ApiResponse<{ taskId: string }>> {
    this.logger.log(
      `Previewing roadmap for target role: ${request.targetRole}`,
    );
    const sourceLanguage = normalizeLanguageCode(requestLanguage);

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
              sourceLanguage,
            },
          },
          tx,
        );

        const [notification] =
          await this.notificationRepository.createNotificationWithRecipients(
            {
              senderId: null,
              title: `Lộ trình học tập cho vai trò ${request.targetRole}`,
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
            jobId: `task-async-${result.task.id}`,
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

    // B8: Single JOIN query to find option + skill + phase instead of full getRoadmapWithDetails
    const optionCtx =
      await this.skillOptionRepository.findOptionWithSkillAndPhase(optionId);

    if (!optionCtx) {
      throw new NotFoundException({
        message: "Option not found in this roadmap",
        code: RESPONSE_CODE.SKILL_NOT_FOUND_IN_ROADMAP,
      });
    }

    const { option: targetOption, skillId, phaseId: targetPhaseId } = optionCtx;

    if (targetOption.completedAt) {
      throw new BadRequestException({
        message: "Option is already completed",
        code: RESPONSE_CODE.BAD_REQUEST,
      });
    }

    // Check prerequisites (prerequisites are skillIds)
    const prerequisitesCompleted =
      await this.skillRepository.checkPrerequisitesCompleted(skillId);

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

      await this.phaseRepository.updatePhaseProgress(targetPhaseId, tx);
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

    const weekSkills = allSkills.filter(
      (skill) => skill.weekStart <= weekNumber && skill.weekEnd >= weekNumber,
    );

    // B5: batch fetch all options for scheduled skills in one query
    const weekSkillIds = weekSkills.map((s) => s.id);
    const allOptions =
      await this.skillOptionRepository.getOptionsBySkillIds(weekSkillIds);

    const completedSkillIds = new Set(
      allOptions
        .filter((o) => o.completedAt !== null)
        .map((o) => o.roadmapSkillId),
    );

    const scheduledSkills = weekSkills.map((skill) => ({
      skillId: skill.id,
      skillName: skill.skill,
      isCompleted: completedSkillIds.has(skill.id),
    }));

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

  async getSkillNote(
    roadmapId: string,
    skillId: string,
    userId: string,
  ): Promise<ApiResponse<SkillNoteDto | null>> {
    const roadmap = await this.roadmapRepository.get(roadmapId);
    if (!roadmap || roadmap.userId !== userId) {
      throw new NotFoundException({
        message: "Roadmap not found",
        code: RESPONSE_CODE.ROADMAP_NOT_FOUND,
      });
    }

    const note = await this.skillNoteRepository.getBySkillAndUser(
      skillId,
      userId,
    );

    return {
      data: note
        ? {
            id: note.id,
            roadmapSkillId: note.roadmapSkillId,
            content: note.content,
          }
        : null,
      message: "Skill note retrieved successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async upsertSkillNote(
    roadmapId: string,
    skillId: string,
    userId: string,
    dto: UpsertSkillNoteDto,
  ): Promise<ApiResponse<SkillNoteDto>> {
    const roadmap = await this.roadmapRepository.get(roadmapId);
    if (!roadmap || roadmap.userId !== userId) {
      throw new NotFoundException({
        message: "Roadmap not found",
        code: RESPONSE_CODE.ROADMAP_NOT_FOUND,
      });
    }

    const note = await this.skillNoteRepository.upsert(
      skillId,
      userId,
      dto.content,
    );

    return {
      data: {
        id: note.id,
        roadmapSkillId: note.roadmapSkillId,
        content: note.content,
      },
      message: "Skill note saved successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async getStudyGuideNotes(
    roadmapId: string,
    userId: string,
  ): Promise<ApiResponse<SkillNoteForStudyGuideDto[]>> {
    const roadmap = await this.roadmapRepository.get(roadmapId);
    if (!roadmap || roadmap.userId !== userId) {
      throw new NotFoundException({
        message: "Roadmap not found",
        code: RESPONSE_CODE.ROADMAP_NOT_FOUND,
      });
    }

    const notes = await this.skillNoteRepository.getAllByRoadmapAndUser(
      roadmapId,
      userId,
    );

    return {
      data: notes
        .filter((n) => n.content.trim().length > 0)
        .map((n) => ({
          skillName: n.skillName,
          phaseName: n.phaseName,
          content: n.content,
        })),
      message: "Study guide notes retrieved successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }
}
