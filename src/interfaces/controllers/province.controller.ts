import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiResponseDto, ApiResponse, ProvinceDto } from "../dtos";
import { ProvinceUseCases } from "@/use-cases/province/province.use-case";
import { GuestGuard } from "@/frameworks/auth-services/guards/guest.guard";

@ApiTags("Provinces")
@Controller("provinces")
export class ProvinceController {
  constructor(private readonly provinceUseCases: ProvinceUseCases) {}

  @ApiOperation({
    summary: "Get all provinces",
  })
  @ApiResponseDto(ProvinceDto, { isArray: true })
  @UseGuards(GuestGuard)
  @Get()
  async getProvinces(): Promise<ApiResponse<ProvinceDto[]>> {
    return this.provinceUseCases.getProvinces();
  }
}
