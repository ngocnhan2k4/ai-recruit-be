import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards";
import { GetUser } from "@/common/decorators";
import type { TokenPayload } from "@/common/types";
import type { ApiResponse } from "@/interfaces/dtos";
import {
  TranslateContentRequestDto,
  TranslateContentResponseDto,
} from "@/interfaces/dtos/translation";
import { TranslationUseCase } from "@/use-cases/translation/translation.use-case";

@ApiTags("Translations")
@Controller("translations")
export class TranslationController {
  constructor(private readonly translationUseCase: TranslationUseCase) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({
    summary: "Lazy translate content and cache for 3 days",
  })
  async translate(
    @Body() dto: TranslateContentRequestDto,
    @GetUser() user: TokenPayload,
  ): Promise<ApiResponse<TranslateContentResponseDto>> {
    return this.translationUseCase.translate(dto, user);
  }
}
