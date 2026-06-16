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
  Headers,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { LearningPathUseCase } from "@/use-cases/learning-path/learning-path.use-case";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards";
import { ApiResponse, PaginatedResultDto } from "../../dtos";
import { GetUser } from "@/common/decorators";
import { type TokenPayload } from "@/common/types";
import { Logger } from "@nestjs/common";

import {
  PreviewRoadmapDto,
  GetRoadmapsQueryDto,
  RoadmapProgressStatsDto,
  UpdateWeeklyHoursDto,
  WeeklyProgressResponseDto,
  UpsertSkillNoteDto,
  SkillNoteDto,
  SkillNoteForStudyGuideDto,
  SaveQuizResultDto,
} from "@/interfaces/dtos/learning-path";
import {
  LearningRoadmap,
  LearningRoadmapWithDetails,
  WeeklyProgress,
  SubpathWithDetails,
  SubpathModuleQuizResult,
} from "@/core";

@ApiTags("Learning Path")
@Controller("learning-roadmaps")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LearningPathController {
  private readonly logger = new Logger(LearningPathController.name);

  constructor(private readonly learningPathUseCase: LearningPathUseCase) {}

  @Post()
  @ApiOperation({
    summary: "Create learning roadmap generation task",
    description:
      "Start roadmap generation asynchronously and receive progress via notifications.",
  })
  createRoadmap(
    @Body() dto: PreviewRoadmapDto,
    @GetUser() user: TokenPayload,
    @Headers("accept-language") acceptLanguage?: string,
  ): Promise<ApiResponse<{ taskId: string }>> {
    return this.learningPathUseCase.createRoadmap(
      dto,
      user.userId,
      acceptLanguage,
    );
  }

  // @Post()
  // @ApiOperation({
  //   summary: "Save learning roadmap",
  //   description:
  //     "Save a learning roadmap to database using preview data from /preview endpoint. Does NOT call AI again.",
  // })
  // async saveRoadmap(
  //   @GetUser() user: TokenPayload,
  //   @Body() dto: SaveRoadmapDto,
  // ): Promise<ApiResponse<LearningRoadmap>> {
  //   return await this.learningPathUseCase.saveRoadmap(user.userId, dto);
  // }

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

  @Put(":roadmapId/options/:optionId/complete")
  @ApiOperation({
    summary: "Mark skill option as completed",
    description:
      "Mark a specific skill option as completed (e.g., completing 'Go' from programming language options). This will unlock dependent skills and update overall progress.",
  })
  @ApiParam({
    name: "roadmapId",
    description: "Roadmap ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @ApiParam({
    name: "optionId",
    description:
      "Skill option ID to mark as completed (the specific choice user made from available options)",
    example: "550e8400-e29b-41d4-a716-446655440001",
  })
  async completeSkill(
    @GetUser() user: TokenPayload,
    @Param("roadmapId") roadmapId: string,
    @Param("optionId") optionId: string,
  ): Promise<ApiResponse<{ unlockedSkills: string[] }>> {
    return await this.learningPathUseCase.completeSkill(
      roadmapId,
      optionId,
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

  @Put(":roadmapId/weekly-progress")
  @ApiOperation({
    summary: "Update weekly study hours",
    description: "Update the number of hours studied for a specific week",
  })
  @ApiParam({
    name: "roadmapId",
    description: "Roadmap ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  async updateWeeklyHours(
    @GetUser() user: TokenPayload,
    @Param("roadmapId") roadmapId: string,
    @Body() dto: UpdateWeeklyHoursDto,
  ): Promise<ApiResponse<WeeklyProgress>> {
    return await this.learningPathUseCase.updateWeeklyHours(
      roadmapId,
      dto.weekNumber,
      dto.hoursSpent,
      user.userId,
    );
  }

  @Get(":roadmapId/weekly-progress/:weekNumber")
  @ApiOperation({
    summary: "Get weekly progress details",
    description:
      "Get progress details for a specific week including hours spent, skills completed, and scheduled skills",
  })
  @ApiParam({
    name: "roadmapId",
    description: "Roadmap ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @ApiParam({
    name: "weekNumber",
    description: "Week number",
    example: 3,
  })
  async getWeeklyProgress(
    @GetUser() user: TokenPayload,
    @Param("roadmapId") roadmapId: string,
    @Param("weekNumber") weekNumber: string,
  ): Promise<ApiResponse<WeeklyProgressResponseDto>> {
    return await this.learningPathUseCase.getWeeklyProgress(
      roadmapId,
      parseInt(weekNumber, 10),
      user.userId,
    );
  }

  @Get(":roadmapId/skills/:skillId/note")
  @ApiOperation({ summary: "Get note for a skill" })
  async getSkillNote(
    @GetUser() user: TokenPayload,
    @Param("roadmapId") roadmapId: string,
    @Param("skillId") skillId: string,
  ): Promise<ApiResponse<SkillNoteDto | null>> {
    return await this.learningPathUseCase.getSkillNote(
      roadmapId,
      skillId,
      user.userId,
    );
  }

  @Put(":roadmapId/skills/:skillId/note")
  @ApiOperation({ summary: "Create or update note for a skill" })
  async upsertSkillNote(
    @GetUser() user: TokenPayload,
    @Param("roadmapId") roadmapId: string,
    @Param("skillId") skillId: string,
    @Body() dto: UpsertSkillNoteDto,
  ): Promise<ApiResponse<SkillNoteDto>> {
    return await this.learningPathUseCase.upsertSkillNote(
      roadmapId,
      skillId,
      user.userId,
      dto,
    );
  }

  @Get(":roadmapId/study-guide")
  @ApiOperation({
    summary: "Get all notes for Study Guide export",
    description:
      "Returns all non-empty skill notes in this roadmap, ordered by phase and skill, for generating a Study Guide.",
  })
  @ApiParam({ name: "roadmapId", description: "Roadmap ID" })
  async getStudyGuideNotes(
    @GetUser() user: TokenPayload,
    @Param("roadmapId") roadmapId: string,
  ): Promise<ApiResponse<SkillNoteForStudyGuideDto[]>> {
    return await this.learningPathUseCase.getStudyGuideNotes(
      roadmapId,
      user.userId,
    );
  }

  @Get(":roadmapId/options/:optionId/subpath")
  @ApiOperation({
    summary: "Get or generate subpath for an option",
  })
  @ApiParam({ name: "roadmapId", description: "Roadmap ID" })
  @ApiParam({ name: "optionId", description: "Skill option ID" })
  async getOrGenerateSubPath(
    @GetUser() user: TokenPayload,
    @Param("roadmapId") roadmapId: string,
    @Param("optionId") optionId: string,
  ): Promise<ApiResponse<SubpathWithDetails>> {
    return await this.learningPathUseCase.getOrGenerateSubPath(
      roadmapId,
      optionId,
      user.userId,
    );
  }

  @Put(":roadmapId/resources/:resourceId/toggle")
  @ApiOperation({
    summary: "Toggle resource completion",
    description: "Mark a learning resource as completed or uncompleted.",
  })
  @ApiParam({ name: "roadmapId", description: "Roadmap ID" })
  @ApiParam({ name: "resourceId", description: "Resource ID" })
  async toggleResourceCompletion(
    @GetUser() user: TokenPayload,
    @Param("roadmapId") roadmapId: string,
    @Param("resourceId") resourceId: string,
  ): Promise<ApiResponse<{ completed: boolean }>> {
    return await this.learningPathUseCase.toggleResourceCompletion(
      roadmapId,
      resourceId,
      user.userId,
    );
  }

  @Post(":roadmapId/modules/:moduleId/quiz-result")
  @ApiOperation({ summary: "Save quiz result for a module" })
  @ApiParam({ name: "roadmapId", description: "Roadmap ID" })
  @ApiParam({ name: "moduleId", description: "Subpath module ID" })
  async saveModuleQuizResult(
    @GetUser() user: TokenPayload,
    @Param("roadmapId") roadmapId: string,
    @Param("moduleId") moduleId: string,
    @Body() dto: SaveQuizResultDto,
  ): Promise<ApiResponse<SubpathModuleQuizResult>> {
    return await this.learningPathUseCase.saveModuleQuizResult(
      roadmapId,
      moduleId,
      dto.score,
      dto.totalQuestions,
      user.userId,
    );
  }
}
