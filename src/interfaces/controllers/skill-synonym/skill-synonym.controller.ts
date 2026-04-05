import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  ApiResponse,
  ApiResponseDto,
  CreateSkillSynonymDto,
  GetSkillsSynonymsQueryDto,
  PaginatedResultDto,
  SkillSynonymResponseDto,
  UpdateSkillSynonymDto,
} from "@/interfaces/dtos";
import { SkillSynonymUseCases } from "@/use-cases/skill-synonym/skill-synonym";
import {
  JwtAuthGuard,
  SystemAuthorizeGuard,
} from "@/frameworks/auth-services/guards";

@ApiTags("Skill Synonyms Admin")
@UseGuards(JwtAuthGuard, SystemAuthorizeGuard)
@Controller("admin/skill-synonyms")
export class SkillSynonymController {
  constructor(private readonly skillSynonymUseCases: SkillSynonymUseCases) {}

  @ApiOperation({
    summary: "Get paginated skill synonyms",
    description:
      "Get paginated list of master skills and their aliases, optionally filtered by keyword.",
  })
  @ApiResponseDto(SkillSynonymResponseDto, { isArray: true })
  @Get()
  async getSkillsSynonyms(
    @Query() query: GetSkillsSynonymsQueryDto,
  ): Promise<ApiResponse<PaginatedResultDto<SkillSynonymResponseDto>>> {
    return this.skillSynonymUseCases.getSkillsSynonyms(query);
  }

  @ApiOperation({
    summary: "Create skill synonym group",
    description: "Create a master skill with its alias list.",
  })
  @ApiResponseDto(SkillSynonymResponseDto)
  @Post()
  async createSkillSynonym(
    @Body() dto: CreateSkillSynonymDto,
  ): Promise<ApiResponse<SkillSynonymResponseDto>> {
    return this.skillSynonymUseCases.createSkillSynonym(dto);
  }

  @ApiOperation({
    summary: "Update skill synonym group",
    description:
      "Update aliases of a master skill. Alias list is replaced by provided array.",
  })
  @ApiResponseDto(SkillSynonymResponseDto)
  @Patch(":masterName")
  async updateSkillSynonym(
    @Param("masterName") masterName: string,
    @Body() dto: UpdateSkillSynonymDto,
  ): Promise<ApiResponse<SkillSynonymResponseDto>> {
    return this.skillSynonymUseCases.updateSkillSynonym(masterName, dto);
  }

  @ApiOperation({
    summary: "Delete skill synonym group",
    description: "Delete a master skill and all related aliases.",
  })
  @Delete(":masterName")
  async deleteSkillSynonym(
    @Param("masterName") masterName: string,
  ): Promise<ApiResponse<void>> {
    return this.skillSynonymUseCases.deleteSkillSynonym(masterName);
  }
}
