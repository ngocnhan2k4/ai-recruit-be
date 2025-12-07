import { GetUser } from "@/common/decorators/get-user.decorator";
import type { TokenPayload } from "@/common/types/token";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards";
import { ApiResponse, ApiResponseDto } from "@/interfaces/dtos";
import { AiCvListResponseDto } from "@/interfaces/dtos/ai-cv/ai-cv.dto";
import { AiCvUseCases } from "@/use-cases/ai-cv/ai-cv.use-cases";
import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";

@ApiTags("AI CV")
@Controller("ai-cv")
@UseGuards(JwtAuthGuard)
export class AiCvController {
  constructor(private readonly aiCvUseCases: AiCvUseCases) {}

  @ApiOperation({
    summary: "Get AI CVs",
    description:
      "Retrieve all AI-optimized CVs for the authenticated user or a specific user.",
  })
  @ApiQuery({
    name: "userId",
    required: false,
    description:
      "User ID to get CVs for. If not provided, returns CVs for the authenticated user.",
    example: "uuid-user-id",
  })
  @ApiResponseDto(AiCvListResponseDto)
  @Get()
  async getAiCvs(
    @GetUser() user: TokenPayload,
    @Query("userId") userId?: string,
  ): Promise<ApiResponse<AiCvListResponseDto>> {
    const targetUserId = userId || user.userId;
    return this.aiCvUseCases.getAiCvs(targetUserId);
  }
}
