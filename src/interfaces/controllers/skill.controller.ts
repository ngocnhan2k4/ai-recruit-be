import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiResponseDto, ApiResponse, SkillDto } from "../dtos";
import { GuestGuard } from "@/frameworks/auth-services/guards/guest.guard";
import { SkillUseCases } from "@/use-cases/skill/skill.use-case";

@ApiTags("Skills")
@Controller("skills")
export class SkillController {
  constructor(private readonly skillUseCases: SkillUseCases) {}

  @ApiOperation({
    summary: "Get all skills",
  })
  @ApiResponseDto(SkillDto, { isArray: true })
  @UseGuards(GuestGuard)
  @Get("/all")
  async getSkills(): Promise<ApiResponse<SkillDto[]>> {
    return this.skillUseCases.getSkills();
  }
}
