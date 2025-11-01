import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
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
  @UseGuards(JwtAuthGuard)
  async getUniversities(): Promise<ApiResponse<Partial<OrganizationDto>[]>> {
    return this.universityUseCases.getUniversities();
  }
}
