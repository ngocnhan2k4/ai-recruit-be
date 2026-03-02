import { Controller, Get, UseInterceptors } from "@nestjs/common";
import { CacheInterceptor, CacheTTL } from "@nestjs/cache-manager";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiResponseDto, ApiResponse, ProvinceDto } from "../../dtos";
import { ProvinceUseCases } from "@/use-cases/province/province.use-case";

@ApiTags("Provinces")
@Controller("provinces")
export class ProvinceController {
  constructor(private readonly provinceUseCases: ProvinceUseCases) {}

  @ApiOperation({
    summary: "Get all provinces",
  })
  @ApiResponseDto(ProvinceDto, { isArray: true })
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(7 * 24 * 60 * 60 * 1000) // 7 days (ms)
  @Get()
  async getProvinces(): Promise<ApiResponse<ProvinceDto[]>> {
    return this.provinceUseCases.getProvinces();
  }
}
