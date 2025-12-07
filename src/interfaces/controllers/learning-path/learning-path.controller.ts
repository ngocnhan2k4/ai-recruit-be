import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import {
  Body,
  Controller,
  Post,
  Get,
  Delete,
  Put,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { LearningPathUseCase } from "@/use-cases/learning-path/learning-path.use-case";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards";
import { ApiResponse, PaginatedResultDto } from "../../dtos";
import { GetUser } from "@/common/decorators/get-user.decorator";
import { type TokenPayload } from "@/common/types/token";

import {
  PreviewRoadmapDto,
  SaveRoadmapDto,
  GetRoadmapsQueryDto,
  RoadmapProgressStatsDto,
} from "@/interfaces/dtos/learning-path";
import {
  LearningRoadmap,
  LearningRoadmapWithDetails,
  PreviewRoadmapResponse,
} from "@/core";

@ApiTags("Learning Path")
@Controller("learning-roadmaps")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LearningPathController {
  constructor(private readonly learningPathUseCase: LearningPathUseCase) {}

  @Post("preview")
  @ApiOperation({
    summary: "Preview learning roadmap",
    description:
      "Generate a roadmap preview without saving to database. Use this before creating a roadmap.",
  })
  async previewRoadmap(
    @Body() dto: PreviewRoadmapDto,
  ): Promise<ApiResponse<PreviewRoadmapResponse>> {
    return await this.learningPathUseCase.previewRoadmap(dto);
  }

  @Post()
  @ApiOperation({
    summary: "Save learning roadmap",
    description:
      "Save a learning roadmap to database using preview data from /preview endpoint. Does NOT call AI again.",
  })
  async saveRoadmap(
    @GetUser() user: TokenPayload,
    @Body() dto: SaveRoadmapDto,
  ): Promise<ApiResponse<LearningRoadmap>> {
    return await this.learningPathUseCase.saveRoadmap(user.userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: "Get user's learning roadmaps",
    description: "Get paginated list of learning roadmaps for current user",
  })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    example: 20,
  })
  async getRoadmaps(
    @GetUser() user: TokenPayload,
    @Query() query: GetRoadmapsQueryDto,
  ): Promise<ApiResponse<PaginatedResultDto<LearningRoadmap>>> {
    return await this.learningPathUseCase.getRoadmaps(user.userId, query);
  }

  @Get(":roadmapId")
  @ApiOperation({
    summary: "Get roadmap details",
    description:
      "Get detailed roadmap information including all phases and skills",
  })
  @ApiParam({
    name: "roadmapId",
    description: "Roadmap ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  async getRoadmapDetails(
    @GetUser() user: TokenPayload,
    @Param("roadmapId") roadmapId: string,
  ): Promise<ApiResponse<LearningRoadmapWithDetails>> {
    return await this.learningPathUseCase.getRoadmapDetails(
      roadmapId,
      user.userId,
    );
  }

  @Delete(":roadmapId")
  @ApiOperation({
    summary: "Delete learning roadmap",
    description: "Soft delete a learning roadmap and all associated data",
  })
  @ApiParam({
    name: "roadmapId",
    description: "Roadmap ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  async deleteRoadmap(
    @GetUser() user: TokenPayload,
    @Param("roadmapId") roadmapId: string,
  ): Promise<ApiResponse<void>> {
    return await this.learningPathUseCase.deleteRoadmap(roadmapId, user.userId);
  }

  @Put(":roadmapId/skills/:skillId/complete")
  @ApiOperation({
    summary: "Mark skill as completed",
    description:
      "Mark a skill as completed. This will unlock dependent skills and update overall progress.",
  })
  @ApiParam({
    name: "roadmapId",
    description: "Roadmap ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @ApiParam({
    name: "skillId",
    description: "Skill ID to mark as completed",
    example: "550e8400-e29b-41d4-a716-446655440001",
  })
  async completeSkill(
    @GetUser() user: TokenPayload,
    @Param("roadmapId") roadmapId: string,
    @Param("skillId") skillId: string,
  ): Promise<ApiResponse<{ unlockedSkills: string[] }>> {
    return await this.learningPathUseCase.completeSkill(
      roadmapId,
      skillId,
      user.userId,
    );
  }

  @Get(":roadmapId/progress")
  @ApiOperation({
    summary: "Get roadmap progress statistics",
    description:
      "Get detailed progress statistics including completed positions, phases, and estimated completion date",
  })
  @ApiParam({
    name: "roadmapId",
    description: "Roadmap ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  async getProgressStats(
    @GetUser() user: TokenPayload,
    @Param("roadmapId") roadmapId: string,
  ): Promise<ApiResponse<RoadmapProgressStatsDto>> {
    return await this.learningPathUseCase.getProgressStats(
      roadmapId,
      user.userId,
    );
  }

  @Get(":roadmapId/selected-skills")
  @ApiOperation({
    summary: "Get user's selected/completed skills",
    description:
      "Get only the skills that the user has completed (marked as done). This shows the actual learning path the user chose from the available options.",
  })
  @ApiParam({
    name: "roadmapId",
    description: "Roadmap ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  async getSelectedSkills(
    @GetUser() user: TokenPayload,
    @Param("roadmapId") roadmapId: string,
  ): Promise<ApiResponse<LearningRoadmapWithDetails>> {
    return await this.learningPathUseCase.getSelectedSkills(
      roadmapId,
      user.userId,
    );
  }
}
