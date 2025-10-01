import { ProvinceUseCases } from "@/use-cases/province/province.use-case";
import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiResponseDto, ApiResponse } from "../dtos";
import { ProvinceDto } from "../dtos/province.dto";

@ApiTags("Provinces")
@Controller("provinces")
export class ProvinceController {
  constructor(private readonly provinceUseCases: ProvinceUseCases) {}

  @ApiOperation({
    summary: "Get all provinces",
  })
  @ApiResponseDto(ProvinceDto, { isArray: true })
  @Get()
  async getProvinces(): Promise<ApiResponse<ProvinceDto[]>> {
    return this.provinceUseCases.getProvinces();
  }
}
