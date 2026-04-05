import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards/jwt-auth.guard";
import { SystemAuthorizeGuard } from "@/frameworks/auth-services/guards/system-authorize.guard";
import { SubscriptionUseCases } from "@/use-cases/subscription/subscription.use-case";
import {
  CreateSubscriptionRequestDto,
  SubscriptionFilterDto,
  UpdateUserSubscriptionRequestDto,
  UpdateSubscriptionRequestDto,
  UpsertSubscriptionFeaturesRequestDto,
} from "@/interfaces/dtos";

@ApiTags("Admin - Subscriptions")
@ApiBearerAuth()
@Controller("admin/subscriptions")
@UseGuards(JwtAuthGuard, SystemAuthorizeGuard)
export class AdminSubscriptionController {
  constructor(private readonly subscriptionUseCases: SubscriptionUseCases) {}

  @ApiOperation({ summary: "List subscriptions" })
  @Get()
  getSubscriptions(@Query() query: SubscriptionFilterDto) {
    return this.subscriptionUseCases.getSubscriptions(query);
  }

  @ApiOperation({ summary: "Get subscription by id" })
  @Get(":id")
  getSubscription(@Param("id") id: string) {
    return this.subscriptionUseCases.getSubscriptionById(id);
  }

  @ApiOperation({ summary: "Create subscription" })
  @Post()
  createSubscription(@Body() dto: CreateSubscriptionRequestDto) {
    return this.subscriptionUseCases.createSubscription(dto);
  }

  @ApiOperation({ summary: "Update subscription" })
  @Patch(":id")
  updateSubscription(
    @Param("id") id: string,
    @Body() dto: UpdateSubscriptionRequestDto,
  ) {
    return this.subscriptionUseCases.updateSubscription(id, dto);
  }

  @ApiOperation({ summary: "Delete subscription (soft delete)" })
  @Delete(":id")
  deleteSubscription(@Param("id") id: string) {
    return this.subscriptionUseCases.deleteSubscription(id);
  }

  @ApiOperation({
    summary: "Upsert many features for a subscription (set limits)",
  })
  @Post(":id/features")
  upsertSubscriptionFeatures(
    @Param("id") id: string,
    @Body() dto: UpsertSubscriptionFeaturesRequestDto,
  ) {
    return this.subscriptionUseCases.upsertSubscriptionFeatures(id, dto);
  }

  @ApiOperation({ summary: "Update user subscription manually" })
  @Patch("user-subscriptions/:id")
  updateUserSubscription(
    @Param("id") id: string,
    @Body() dto: UpdateUserSubscriptionRequestDto,
  ) {
    return this.subscriptionUseCases.updateUserSubscription(id, dto);
  }
}
