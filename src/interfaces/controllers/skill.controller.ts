import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiResponseDto, ApiResponse, SkillDto } from "../dtos";
import { SkillUseCases } from "@/use-cases/skill/skill.use-case";

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
}
