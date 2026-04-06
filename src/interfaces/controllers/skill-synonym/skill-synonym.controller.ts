import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  ApiResponse,
  ApiResponseDto,
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
    summary: "Update skill synonym group",
    description: "Update aliases of a skill by id.",
  })
  @ApiResponseDto(SkillSynonymResponseDto)
  @Put(":skillId")
  async updateSkillSynonym(
    @Param("skillId") skillId: string,
    @Body() dto: UpdateSkillSynonymDto,
  ): Promise<ApiResponse<SkillSynonymResponseDto>> {
    return this.skillSynonymUseCases.updateSkillSynonym(skillId, dto);
  }
}
