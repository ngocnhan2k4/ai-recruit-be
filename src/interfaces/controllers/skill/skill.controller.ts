import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Query,
} from "@nestjs/common";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
  UseGuards,
  Query,
  UseInterceptors,
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
} from "../../dtos";
import { HttpCacheInterceptor } from "@/common/interceptors/http-cache.interceptor";
import { SkillUseCases } from "@/use-cases/skill/skill.use-case";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards/jwt-auth.guard";

@ApiTags("Skills")
@Controller("skills")
export class SkillController {
  constructor(private readonly skillUseCases: SkillUseCases) {}

  @ApiOperation({
    summary: "Get all skills",
  })
  @ApiResponseDto(SkillDto, { isArray: true })
  @Get("/all")
  async getSkills(): Promise<ApiResponse<SkillDto[]>> {
    return this.skillUseCases.getSkills();
  }

  @ApiOperation({
    summary: "Get skill by index (Sentry demo)",
    description:
      "Fetches all skills then accesses the item at the given index. " +
      "Passing an index out of range causes a real TypeError → captured by Sentry as a 500.",
  })
  @ApiParam({
    name: "index",
    example: 999,
    description:
      "Use a large number (e.g. 999) to trigger the out-of-range error",
  })
  @Get("by-index/:index")
  async getSkillByIndex(
    @Param("index", ParseIntPipe) index: number,
  ): Promise<ApiResponse<SkillDto>> {
    const result = await this.skillUseCases.getSkills();
    const skill = (result.data ?? [])[index];

    // Accessing .id on undefined when index is out of range → TypeError
    // This simulates a real production bug where a missing null-check blows up
    return {
      message: "Skill fetched successfully",
      code: "SUCCESS",
      data: { id: skill.id, name: skill.name },
    };
  }

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
  @UseInterceptors(HttpCacheInterceptor)
  @CacheTTL(LLONG_TTL)
  @Get()
  async getPaginatedSkills(
    @Query() query: GetSkillsQueryDto,
  ): Promise<ApiResponse<PaginatedResultDto<SkillDto>>> {
    return await this.skillUseCases.getPaginatedSkills(query);
  }
}
