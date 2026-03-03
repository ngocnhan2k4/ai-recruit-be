import { Controller, Get, UseGuards, UseInterceptors } from "@nestjs/common";
import { CacheInterceptor, CacheTTL } from "@nestjs/cache-manager";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { LLONG_TTL } from "@/common/constants";
import { ApiResponseDto, ApiResponse, OrganizationDto } from "../../dtos";
import { UniversityUseCases } from "@/use-cases/university/university.use-case";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards/jwt-auth.guard";

@ApiTags("Universities")
@Controller("universities")
export class UniversityController {
  constructor(private readonly universityUseCases: UniversityUseCases) {}

  @ApiOperation({
    summary: "Get all universities",
  })
  @Get("/all")
  @ApiResponseDto(OrganizationDto, {
    isArray: true,
  })
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(LLONG_TTL)
  @UseGuards(JwtAuthGuard)
  async getUniversities(): Promise<ApiResponse<Partial<OrganizationDto>[]>> {
    return this.universityUseCases.getUniversities();
  }
}
