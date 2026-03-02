import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Query,
  UseInterceptors,
} from "@nestjs/common";
import { CacheTTL } from "@nestjs/cache-manager";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  ApiResponseDto,
  ApiResponse,
  SkillDto,
  CreateSkillDto,
  PaginatedResultDto,
  GetSkillsQueryDto,
} from "../../dtos";
import { HttpCacheInterceptor } from "@/common/interceptors/http-cache.interceptor";
import { SkillUseCases } from "@/use-cases/skill/skill.use-case";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards/jwt-auth.guard";

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
    console.log(createSkillDto);
    return this.skillUseCases.createMany(createSkillDto);
  }

  @ApiOperation({
    summary: "Get pageinated skills",
  })
  @ApiResponseDto(SkillDto, { isArray: true })
  @UseInterceptors(HttpCacheInterceptor)
  @CacheTTL(7 * 24 * 60 * 60 * 1000) // 7 days (ms)
  @Get()
  async getPaginatedSkills(
    @Query() query: GetSkillsQueryDto,
  ): Promise<ApiResponse<PaginatedResultDto<SkillDto>>> {
    return await this.skillUseCases.getPaginatedSkills(query);
  }
}
