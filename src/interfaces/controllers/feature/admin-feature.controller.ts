import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards/jwt-auth.guard";
import { SystemAuthorizeGuard } from "@/frameworks/auth-services/guards/system-authorize.guard";
import { FeatureUseCases } from "@/use-cases/feature/feature.use-case";
import {
  CreateFeatureRequestDto,
  UpdateFeatureRequestDto,
} from "@/interfaces/dtos/feature";
import { GeneralQueryDto } from "@/interfaces/dtos";

@ApiTags("Admin - Features")
@ApiBearerAuth()
@Controller("admin/features")
@UseGuards(JwtAuthGuard, SystemAuthorizeGuard)
export class AdminFeatureController {
  constructor(private readonly featureUseCases: FeatureUseCases) {}

  @ApiOperation({ summary: "List features" })
  @Get()
  getFeatures(
    @Query() query: GeneralQueryDto,
    @Headers("accept-language") acceptLanguage?: string,
  ) {
    return this.featureUseCases.getFeatures(query, acceptLanguage);
  }

  @ApiOperation({ summary: "Get feature by id" })
  @Get(":id")
  getFeature(
    @Param("id") id: string,
    @Headers("accept-language") acceptLanguage?: string,
  ) {
    return this.featureUseCases.getFeatureById(Number(id), acceptLanguage);
  }

  @ApiOperation({ summary: "Create feature" })
  @Post()
  createFeature(
    @Body() dto: CreateFeatureRequestDto,
    @Headers("accept-language") acceptLanguage?: string,
  ) {
    return this.featureUseCases.createFeature(dto, acceptLanguage);
  }

  @ApiOperation({ summary: "Update feature" })
  @Patch(":id")
  updateFeature(
    @Param("id") id: string,
    @Body() dto: UpdateFeatureRequestDto,
    @Headers("accept-language") acceptLanguage?: string,
  ) {
    return this.featureUseCases.updateFeature(Number(id), dto, acceptLanguage);
  }

  @ApiOperation({ summary: "Delete feature" })
  @Delete(":id")
  deleteFeature(@Param("id") id: string) {
    return this.featureUseCases.deleteFeature(Number(id));
  }
}
