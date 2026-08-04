import { Controller, Get, UseInterceptors } from "@nestjs/common";
import { CacheTTL } from "@nestjs/cache-manager";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { LONG_TTL } from "@/common/constants";
import { HttpCacheInterceptor } from "@/common/interceptors/http-cache.interceptor";
import {
  ApiResponse,
  ApiResponseDto,
  HomeDashboardDto,
} from "@/interfaces/dtos";
import { HomeUseCases } from "@/use-cases/home/home.use-case";

@ApiTags("Home")
@Controller("home")
export class HomeController {
  constructor(private readonly homeUseCases: HomeUseCases) {}

  @ApiOperation({
    summary: "Get homepage dashboard data",
    description:
      "Public homepage payload: top applied jobs and the latest published AI weekly market-analysis blog.",
  })
  @ApiResponseDto(HomeDashboardDto)
  @UseInterceptors(HttpCacheInterceptor)
  @CacheTTL(LONG_TTL)
  @Get()
  async getHomeDashboard(): Promise<ApiResponse<HomeDashboardDto>> {
    return this.homeUseCases.getHomeDashboard();
  }
}
