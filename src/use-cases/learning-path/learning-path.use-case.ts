import { Injectable } from "@nestjs/common";
import { IAIService } from "@/core/abstracts";
import { Inject } from "@nestjs/common";
import { GenerateRoadmapRequestDto } from "@/interfaces/dtos/learning-path";
import { GeneratedRoadmap } from "@/core/entities/learning-path.entity";
import { SkillLevelEnum } from "@/core/entities/enum.entity";
import { ApiResponse } from "@/interfaces/dtos";
import { RESPONSE_CODE } from "@/common/constants/response";

@Injectable()
export class LearningPathUseCase {
  constructor(
    @Inject(IAIService)
    private readonly aiService: IAIService,
  ) {}

  async generateRoadmap(
    request: GenerateRoadmapRequestDto,
  ): Promise<ApiResponse<GeneratedRoadmap>> {
    const roadmapRequest = {
      currentRole: request.currentRole,
      targetRole: request.targetRole,
      timelineWeeks: request.timelineWeeks,
      timeCommitmentHoursPerWeek: request.timeCommitmentHoursPerWeek,
      currentSkills: request.currentSkills
        ? Object.entries(request.currentSkills).reduce(
            (acc, [key, value]) => {
              acc[key] = {
                level: value.level,
                confidence: value.confidence,
              };
              return acc;
            },
            {} as Record<
              string,
              {
                level: SkillLevelEnum;
                confidence: number;
              }
            >,
          )
        : undefined,
    };

    const roadmap = await this.aiService.generateRoadmap(roadmapRequest);

    return {
      data: roadmap,
      message: "Roadmap generated successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }
}
