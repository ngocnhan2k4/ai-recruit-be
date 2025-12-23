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
  Res,
} from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { LearningPathUseCase } from "@/use-cases/learning-path/learning-path.use-case";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards";
import { ApiResponse, PaginatedResultDto } from "../../dtos";
import { GetUser } from "@/common/decorators/get-user.decorator";
import { type TokenPayload } from "@/common/types/token";
import { Logger } from "@nestjs/common";

import {
  PreviewRoadmapDto,
  SaveRoadmapDto,
  GetRoadmapsQueryDto,
  RoadmapProgressStatsDto,
  UpdateWeeklyHoursDto,
  WeeklyProgressResponseDto,
} from "@/interfaces/dtos/learning-path";
import {
  LearningRoadmap,
  LearningRoadmapWithDetails,
  WeeklyProgress,
} from "@/core";

@ApiTags("Learning Path")
@Controller("learning-roadmaps")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LearningPathController {
  private readonly logger = new Logger(LearningPathController.name);

  constructor(private readonly learningPathUseCase: LearningPathUseCase) {}

  @Post("preview")
  @ApiOperation({
    summary: "Preview learning roadmap with SSE streaming",
    description:
      "Generate a roadmap preview with real-time progress updates via Server-Sent Events.",
  })
  previewRoadmap(
    @Body() dto: PreviewRoadmapDto,
    @Res() reply: FastifyReply,
  ): void {
    reply.hijack();

    // Set SSE headers
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": reply.request.headers.origin || "*",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods":
        "GET, HEAD, OPTIONS, PUT, POST, DELETE, PATCH",
      "Access-Control-Allow-Headers": "Cookie, Content-Type,Authorization",
    });

    // Send initial comment to establish connection
    reply.raw.write(": connected\n\n");

    const observable = this.learningPathUseCase.previewRoadmap(dto);

    observable.subscribe({
      next: (event) => {
        const data = JSON.stringify(event.data);
        reply.raw.write(`data: ${data}\n\n`);
        if ((reply.raw as any).flush) {
          (reply.raw as any).flush();
        }
      },
      complete: () => {
        this.logger.log("SSE stream completed");
        reply.raw.end();
      },
      error: (error) => {
        const errorData = JSON.stringify({
          type: "error",
          message: error.message || "Unknown error occurred",
        });
        reply.raw.write(`data: ${errorData}\n\n`);
        reply.raw.end();
      },
    });
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
}
