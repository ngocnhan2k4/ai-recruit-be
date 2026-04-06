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
  GetCrawledSkillsQueryDto,
  PaginatedResultDto,
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
    summary: "Delete a skill",
    description: "Delete a skill by ID, along with all its references.",
  })
  @Delete(":id")
  async deleteSkill(@Param("id") id: string): Promise<ApiResponse<void>> {
    return this.skillUseCases.deleteSkill(id);
  }
}
