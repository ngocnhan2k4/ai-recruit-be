import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiResponse, ApiResponseDto } from "@/interfaces/dtos";
import {
  InternalEsDeleteDto,
  InternalEsSearchDto,
} from "@/interfaces/dtos/internal";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards/jwt-auth.guard";
import { SystemAuthorizeGuard } from "@/frameworks/auth-services/guards";
import { InternalUseCase } from "@/use-cases/internal/internal.use-case";

@ApiTags("Internal")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SystemAuthorizeGuard)
@Controller("internal")
export class InternalController {
  constructor(private readonly internalUseCase: InternalUseCase) {}

  @ApiOperation({
    summary: "Search Elasticsearch by field params",
    description:
      'Map REST body params to ES term/terms query. null or "" → missing/empty field. index whitelist: jobs | cvs | event-tracking.',
  })
  @ApiResponseDto("string")
  @Post("es/search")
  async search(@Body() dto: InternalEsSearchDto): Promise<
    ApiResponse<{
      index: string;
      total: number;
      hits: Array<{
        id: string;
        score: number | null;
        source: Record<string, unknown>;
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
      };
    }>
  > {
    return this.internalUseCase.search(dto);
  }

  @ApiOperation({
    summary: "Delete Elasticsearch documents by IDs",
    description:
      "Delete documents by _id array. index whitelist: jobs | cvs | event-tracking.",
  })
  @ApiResponseDto("string")
  @Post("es/delete")
  async deleteByIds(@Body() dto: InternalEsDeleteDto): Promise<
    ApiResponse<{
      index: string;
      requested: number;
      deleted: number;
      took: number;
    }>
  > {
    return this.internalUseCase.deleteByIds(dto);
  }
}
