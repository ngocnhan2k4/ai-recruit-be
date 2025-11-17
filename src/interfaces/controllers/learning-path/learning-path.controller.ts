import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { LearningPathUseCase } from "@/use-cases/learning-path/learning-path.use-case";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards";
import { ApiResponse } from "../../dtos";

import {
  GenerateRoadmapRequestDto,
  GenerateRoadmapResponseDto,
} from "@/interfaces/dtos/learning-path";

@ApiTags("Learning Path")
@Controller("learning-path")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LearningPathController {
  constructor(private readonly learningPathUseCase: LearningPathUseCase) {}

  @Post("generate-roadmap")
  @ApiOperation({
    summary: "Generate learning roadmap",
    description: "Generate a personalized learning roadmap",
  })
  async generateRoadmap(
    @Body() request: GenerateRoadmapRequestDto,
  ): Promise<ApiResponse<GenerateRoadmapResponseDto>> {
    return await this.learningPathUseCase.generateRoadmap(request);
  }
}
