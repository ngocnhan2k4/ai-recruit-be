import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  ApiResponse,
  ApiResponseDto,
  GetMergeCandidatesQueryDto,
  GetSkillsSynonymsQueryDto,
  MergeCandidateSkillDto,
  MergeSkillsDto,
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

  @ApiOperation({
    summary: "Get merge candidates for a skill",
    description:
      "Suggest similar skills that can be merged into the provided target skill id.",
  })
  @ApiResponseDto(MergeCandidateSkillDto, { isArray: true })
  @Get(":skillId/merge-candidates")
  async getMergeCandidates(
    @Param("skillId") skillId: string,
    @Query() query: GetMergeCandidatesQueryDto,
  ): Promise<ApiResponse<MergeCandidateSkillDto[]>> {
    return this.skillSynonymUseCases.getMergeCandidates(skillId, query);
  }

  @ApiOperation({
    summary: "Merge skills into target skill",
    description:
      "After confirmation from FE, merge source skill IDs into target skill ID and move all references.",
  })
  @Post(":skillId/merge")
  async mergeSkills(
    @Param("skillId") skillId: string,
    @Body() dto: MergeSkillsDto,
  ): Promise<ApiResponse<void>> {
    return this.skillSynonymUseCases.mergeSkills(skillId, dto);
  }
}
