import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiResponseDto, ApiResponse, UniversityDto } from "../dtos";
import { UniversityUseCases } from "@/use-cases/university/university.use-case";

@ApiTags("Universities")
@Controller("universities")
export class UniversityController {
  constructor(private readonly universityUseCases: UniversityUseCases) {}

  @ApiOperation({
    summary: "Get all universities",
  })
  @ApiResponseDto(UniversityDto, { isArray: true })
  @Get("/all")
  async getUniversities(): Promise<ApiResponse<UniversityDto[]>> {
    return this.universityUseCases.getUniversities();
  }
}
