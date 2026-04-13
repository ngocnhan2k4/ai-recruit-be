import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  ApiResponse,
  ApiResponseDto,
  BulkReviewSkillDto,
  CrawledSkillDto,
  DeleteSkillsDto,
  GetCrawledSkillsQueryDto,
  PaginatedResultDto,
  UpdateSkillNameDto,
} from "@/interfaces/dtos";
import { SkillUseCases } from "@/use-cases/skill/skill.use-case";
import {
  JwtAuthGuard,
  SystemAuthorizeGuard,
} from "@/frameworks/auth-services/guards";

@ApiTags("Skills Admin")
@UseGuards(JwtAuthGuard, SystemAuthorizeGuard)
@Controller("admin/skills")
export class AdminSkillController {
  constructor(private readonly skillUseCases: SkillUseCases) {}

  @ApiOperation({
    summary: "Get crawled skills pending review",
  })
  @ApiResponseDto(CrawledSkillDto, { isArray: true })
  @Get("crawled")
  async getCrawledSkills(
    @Query() query: GetCrawledSkillsQueryDto,
  ): Promise<ApiResponse<PaginatedResultDto<CrawledSkillDto>>> {
    return this.skillUseCases.getCrawledSkills(query);
  }

  @ApiOperation({
    summary: "Bulk approve or reject crawled skills",
  })
  @Patch("crawled/bulk-review")
  async bulkReviewSkills(
    @Body() dto: BulkReviewSkillDto,
  ): Promise<ApiResponse<void>> {
    return this.skillUseCases.bulkReviewSkills(dto);
  }

  @ApiOperation({
    summary: "Update skill name",
    description: "Update name of a skill by id.",
  })
  @Patch(":id/name")
  updateSkillName(
    @Param("id") id: string,
    @Body() dto: UpdateSkillNameDto,
  ): Promise<ApiResponse<void>> {
    return this.skillUseCases.updateSkillName(id, dto);
  }

  @ApiOperation({
    summary: "Delete skill(s)",
    description:
      "Delete one or many skills by ID, along with all related references.",
  })
  @Delete("bulk")
  async deleteSkill(@Body() dto: DeleteSkillsDto): Promise<ApiResponse<void>> {
    return this.skillUseCases.deleteSkill(dto);
  }
}
