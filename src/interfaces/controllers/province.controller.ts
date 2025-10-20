import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags, ApiParam } from "@nestjs/swagger";
import { ApiResponseDto, ApiResponse, ProvinceDto } from "../dtos";
import { ProvinceUseCases } from "@/use-cases/province/province.use-case";

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

  @ApiOperation({
    summary: "Get province by ID",
    description: "Retrieve a specific province by its ID",
  })
  @ApiParam({
    name: "id",
    description: "Province ID",
    type: String,
  })
  @ApiResponseDto(ProvinceDto)
  @Get(":id")
  async getProvinceById(
    @Param("id") id: string,
  ): Promise<ApiResponse<ProvinceDto>> {
    return await this.provinceUseCases.getProvinceById(id);
  }
}
