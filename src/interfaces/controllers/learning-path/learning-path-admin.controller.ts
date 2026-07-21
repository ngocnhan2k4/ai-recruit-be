import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { LearningPathUseCase } from "@/use-cases/learning-path/learning-path.use-case";
import {
  ApiResponse,
  ApiResponseDto,
  GetAdminLearningRoadmapsRequestDto,
  GetAdminLearningRoadmapsResponseDto,
  PaginatedResultDto,
} from "@/interfaces/dtos";
import {
  JwtAuthGuard,
  SystemAuthorizeGuard,
} from "@/frameworks/auth-services/guards";

@ApiTags("Admin Learning Path")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SystemAuthorizeGuard)
@Controller("admin/learning-roadmaps")
export class LearningPathAdminController {
  constructor(private readonly learningPathUseCase: LearningPathUseCase) {}

  @ApiOperation({
    summary: "List learning roadmaps (Admin)",
    description:
      "Get paginated list of learning roadmaps for generation monitoring. Supports filtering by generation status, user, date range and keyword.",
  })
  @ApiResponseDto(GetAdminLearningRoadmapsResponseDto)
  @Get()
  async getRoadmaps(
    @Query() query: GetAdminLearningRoadmapsRequestDto,
  ): Promise<
    ApiResponse<PaginatedResultDto<GetAdminLearningRoadmapsResponseDto>>
  > {
    return this.learningPathUseCase.getAdminRoadmaps(query) as Promise<
      ApiResponse<PaginatedResultDto<GetAdminLearningRoadmapsResponseDto>>
    >;
  }

  @ApiOperation({
    summary: "Delete learning roadmap (Admin)",
    description: "Soft-delete a learning roadmap record.",
  })
  @ApiParam({ name: "id", description: "Learning roadmap ID" })
  @Delete(":id")
  async deleteRoadmap(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<void>> {
    return this.learningPathUseCase.deleteAdminRoadmap(id);
  }
}
