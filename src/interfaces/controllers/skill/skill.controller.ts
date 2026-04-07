import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Query,
  UseInterceptors,
  Param,
} from "@nestjs/common";
import { CacheTTL } from "@nestjs/cache-manager";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { LLONG_TTL } from "@/common/constants";
import {
  ApiResponseDto,
  ApiResponse,
  SkillDto,
  CreateSkillDto,
  PaginatedResultDto,
  GetSkillsQueryDto,
  GetTopDemandedSkillsQueryDto,
  TopDemandedSkillItemDto,
} from "../../dtos";
import { HttpCacheInterceptor } from "@/common/interceptors/http-cache.interceptor";
import { SkillUseCases } from "@/use-cases/skill/skill.use-case";
import {
  JwtAuthGuard,
  OptionalJwtAuthGuard,
} from "@/frameworks/auth-services/guards";

@ApiTags("Skills")
@Controller("skills")
export class SkillController {
  constructor(private readonly skillUseCases: SkillUseCases) {}

  @ApiOperation({
    summary: "Create new skills",
  })
  @ApiResponseDto(SkillDto, { isArray: true })
  @UseGuards(JwtAuthGuard)
  @Post()
  async createMany(
    @Body() createSkillDto: CreateSkillDto,
  ): Promise<ApiResponse<SkillDto[]>> {
    return this.skillUseCases.createMany(createSkillDto);
  }

  @ApiOperation({
    summary: "Get pageinated skills",
  })
  @ApiResponseDto(SkillDto, { isArray: true })
  @Get()
  async getPaginatedSkills(
    @Query() query: GetSkillsQueryDto,
  ): Promise<ApiResponse<PaginatedResultDto<SkillDto>>> {
    return await this.skillUseCases.getPaginatedSkills(query);
  }

  @ApiOperation({
    summary: "Get top demanded skills",
  })
  @ApiResponseDto(TopDemandedSkillItemDto, { isArray: true })
  @UseGuards(OptionalJwtAuthGuard)
  @UseInterceptors(HttpCacheInterceptor)
  @CacheTTL(LLONG_TTL)
  @Get("statistics/top-demanded")
  async getTopDemandedSkills(
    @Query() query: GetTopDemandedSkillsQueryDto,
  ): Promise<ApiResponse<TopDemandedSkillItemDto[]>> {
    return await this.skillUseCases.getTopDemandedSkills(query);
  }

  @ApiOperation({
    summary: "Get skill by ID",
  })
  @Get(":id")
  @UseInterceptors(HttpCacheInterceptor)
  @CacheTTL(LLONG_TTL)
  async getSkillById(@Param("id") id: string): Promise<ApiResponse<SkillDto>> {
    return await this.skillUseCases.getSkillById(id);
  }
}
