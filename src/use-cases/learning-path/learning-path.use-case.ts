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
  IAIService,
} from "@/core/abstracts";
import { Inject } from "@nestjs/common";
import {
  PreviewRoadmapDto,
  SaveRoadmapDto,
  GetRoadmapsQueryDto,
  RoadmapProgressStatsDto,
} from "@/interfaces/dtos/learning-path";
import { ApiResponse, PaginatedResultDto } from "@/interfaces/dtos";
import { RESPONSE_CODE } from "@/common/constants/response";
import {
  LearningRoadmap,
  LearningRoadmapWithDetails,
  PreviewRoadmapResponse,
  RoadmapSkill,
} from "@/core";

@Injectable()
export class LearningPathUseCase {
  private readonly logger = new Logger(LearningPathUseCase.name);

  constructor(
    @Inject(IAIService)
    private readonly aiService: IAIService,
    private readonly roadmapRepository: ILearningRoadmapRepository,
    private readonly phaseRepository: IRoadmapPhaseRepository,
    private readonly skillRepository: IRoadmapSkillRepository,
  ) {}

  async previewRoadmap(
    request: PreviewRoadmapDto,
  ): Promise<ApiResponse<PreviewRoadmapResponse>> {
    this.logger.log(
      `Previewing roadmap for target role: ${request.targetRole}`,
    );

    const roadmapRequest = {
      currentRole: request.currentRole,
      targetRole: request.targetRole,
      timelineWeeks: request.timelineWeeks,
      timeCommitmentHoursPerWeek: request.timeCommitmentHoursPerWeek,
      currentSkills: request.currentSkills,
    };

    const preview = await this.aiService.generateRoadmap(roadmapRequest);

    return {
      data: preview,
      message: "Roadmap preview generated successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async saveRoadmap(
    userId: string,
    dto: SaveRoadmapDto,
  ): Promise<ApiResponse<LearningRoadmap>> {
    this.logger.log(`Saving roadmap for user ${userId}`);

    const preview = dto.previewData;

    if (!preview) {
      throw new BadRequestException("Preview data is required");
    }

    const roadmap = await this.roadmapRepository.executeWithTransaction(
      async (tx) => {
        const newRoadmap = await this.roadmapRepository.create(
          {
            userId,
            title: dto.title,
            currentRole: dto.currentRole,
            targetRole: dto.targetRole,
            timelineWeeks: dto.timelineWeeks,
            timeCommitmentHoursPerWeek: dto.timeCommitmentHoursPerWeek,
            currentSkills: dto.currentSkills,
            totalWeeks: preview.totalWeeks,
            gapAnalysis: preview.gapAnalysis,
            dependencyGraph: preview.dependencyGraph,
          },
          tx,
        );

        await Promise.all(
          preview.phases.map(async (phase) => {
            const newPhase = await this.phaseRepository.create(
              {
                roadmapId: newRoadmap.id,
                name: phase.name,
                description: phase.description,
                durationWeeks: phase.durationWeeks,
                orderIndex: phase.orderIndex,
              },
              tx,
            );

            if (phase.skills?.length) {
              // Flatten all skill options from all positions in this phase
              const skillCreates: Partial<RoadmapSkill>[] = [];

              for (const position of phase.skills) {
                for (const option of position.options) {
                  skillCreates.push({
                    phaseId: newPhase.id,
                    positionName: position.positionName,
                    positionDescription: position.description,
                    skillId: option.skillId,
                    skillName: option.skillName,
                    reason: option.reason,
                    estimatedHours: option.estimatedHours,
                    weekStart: position.weekStart,
                    weekEnd: position.weekEnd,
                    prerequisites: position.prerequisites,
                    resources: option.resources,
                    keyConcepts: option.keyConcepts,
                    orderIndex: position.orderIndex,
                  });
                }
              }

              await this.skillRepository.createManySkills(skillCreates, tx);
            }
          }),
        );

        return newRoadmap;
      },
    );

    this.logger.log(`Roadmap saved successfully: ${roadmap.id}`);

    return {
      data: roadmap,
      message: "Roadmap saved successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

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

  /**
   * Transform flat skills array into grouped structure by position
   */
  private groupSkillsByPosition(skills: RoadmapSkill[]) {
    const positionMap = new Map<
      string,
      {
        positionName: string;
        positionDescription: string;
        weekStart: number;
        weekEnd: number;
        orderIndex: number;
        prerequisites: string[];
        options: Array<{
          id: string;
          skillId: string;
          skillName: string;
          estimatedHours: number;
          resources: any[];
          keyConcepts: string[];
          reason: string;
          completedAt: Date | null;
        }>;
      }
    >();

    for (const skill of skills) {
      const key = `${skill.phaseId}-${skill.positionName}`;

      if (!positionMap.has(key)) {
        positionMap.set(key, {
          positionName: skill.positionName,
          positionDescription: skill.positionDescription,
          weekStart: skill.weekStart,
          weekEnd: skill.weekEnd,
          orderIndex: skill.orderIndex,
          prerequisites: skill.prerequisites,
          options: [],
        });
      }

      positionMap.get(key)!.options.push({
        id: skill.id,
        skillId: skill.skillId,
        skillName: skill.skillName,
        estimatedHours: skill.estimatedHours,
        resources: skill.resources,
        keyConcepts: skill.keyConcepts,
        reason: skill.reason,
        completedAt: skill.completedAt,
      });
    }

    return Array.from(positionMap.values()).sort(
      (a, b) => a.orderIndex - b.orderIndex,
    );
  }

  async getRoadmapDetails(
    roadmapId: string,
    userId: string,
  ): Promise<ApiResponse<LearningRoadmapWithDetails>> {
    this.logger.log(`Fetching roadmap details: ${roadmapId}`);

    const roadmap =
      await this.roadmapRepository.getRoadmapWithDetails(roadmapId);

    if (!roadmap) {
      throw new NotFoundException("Roadmap not found");
    }

    if (roadmap.userId !== userId) {
      throw new NotFoundException("Roadmap not found");
    }

    // Transform phases to group skills by position
    const transformedPhases = roadmap.phases.map((phase) => ({
      ...phase,
      positions: this.groupSkillsByPosition(phase.skills),
      skills: phase.skills, // Keep original for backward compatibility
    }));

    return {
      data: {
        ...roadmap,
        phases: transformedPhases as any,
      },
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
      throw new NotFoundException("Roadmap not found");
    }

    await this.roadmapRepository.delete({ id: roadmapId });

    return {
      message: "Roadmap deleted successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async completeSkill(
    roadmapId: string,
    skillId: string,
    userId: string,
  ): Promise<ApiResponse<{ unlockedSkills: string[] }>> {
    this.logger.log(`Completing skill ${skillId} in roadmap ${roadmapId}`);

    const roadmap = await this.roadmapRepository.get(roadmapId);
    if (!roadmap || roadmap.userId !== userId) {
      throw new NotFoundException("Roadmap not found");
    }

    const allSkills =
      await this.skillRepository.getSkillsByRoadmapId(roadmapId);
    const skill = allSkills.find((s) => s.id === skillId);

    if (!skill) {
      throw new NotFoundException("Skill not found in this roadmap");
    }

    if (skill.completedAt) {
      throw new BadRequestException("Skill already completed");
    }

    const prerequisitesCompleted =
      await this.skillRepository.checkPrerequisitesCompleted(skillId);

    if (!prerequisitesCompleted) {
      throw new BadRequestException(
        "Cannot complete skill: prerequisites not met",
      );
    }

    await this.skillRepository.executeWithTransaction(async (tx) => {
      await this.skillRepository.markSkillCompleted(skillId, tx);
      await this.roadmapRepository.updateProgress(roadmapId);

      const phaseSkills = await this.skillRepository.getSkillsByPhaseId(
        skill.phaseId,
      );
      const allPhaseSkillsCompleted = phaseSkills.every(
        (s) => s.id === skillId || s.completedAt !== null,
      );

      if (allPhaseSkillsCompleted) {
        await this.phaseRepository.markPhaseCompleted(skill.phaseId, tx);
      }
    });

    const unlockedSkills =
      await this.skillRepository.getUnlockedSkills(roadmapId);
    const unlockedSkillIds = unlockedSkills.map((s) => s.id);

    this.logger.log(
      `Skill completed. Unlocked ${unlockedSkillIds.length} new skills`,
    );

    return {
      data: { unlockedSkills: unlockedSkillIds },
      message: "Skill completed successfully",
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
      throw new NotFoundException("Roadmap not found");
    }

    const stats = await this.roadmapRepository.getProgressStats(roadmapId);

    return {
      data: stats,
      message: "Progress stats fetched successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async getSelectedSkills(
    roadmapId: string,
    userId: string,
  ): Promise<ApiResponse<LearningRoadmapWithDetails>> {
    this.logger.log(
      `Fetching selected/completed skills for roadmap ${roadmapId}`,
    );

    const roadmap = await this.roadmapRepository.get(roadmapId);
    if (!roadmap || roadmap.userId !== userId) {
      throw new NotFoundException("Roadmap not found");
    }

    const fullRoadmap =
      await this.roadmapRepository.getRoadmapWithDetails(roadmapId);

    if (!fullRoadmap) {
      throw new NotFoundException("Roadmap not found");
    }

    // Filter to only include completed skills (user has selected these)
    const filteredPhases = fullRoadmap.phases.map((phase) => ({
      ...phase,
      skills: phase.skills.filter((skill) => skill.completedAt !== null),
    }));

    return {
      data: {
        ...fullRoadmap,
        phases: filteredPhases as any,
      },
      message: "Selected skills fetched successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }
}
