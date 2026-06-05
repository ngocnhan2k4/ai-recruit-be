import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards/jwt-auth.guard";
import { SubscriptionUseCases } from "@/use-cases/subscription/subscription.use-case";
import {
  RegisterUserSubscriptionRequestDto,
  SubscriptionFilterDto,
} from "@/interfaces/dtos";
import { GetUser } from "@/common/decorators";
import { type TokenPayload } from "@/common/types";

@ApiTags("Subscriptions")
@ApiBearerAuth()
@Controller("subscriptions")
@UseGuards(JwtAuthGuard)
export class SubscriptionController {
  constructor(private readonly subscriptionUseCases: SubscriptionUseCases) {}

  @ApiOperation({ summary: "List subscriptions" })
  @Get()
  getSubscriptions(@Query() query: SubscriptionFilterDto) {
    return this.subscriptionUseCases.getSubscriptions(query);
  }

  @ApiOperation({ summary: "Create subscription" })
  @Post("register")
  createSubscription(
    @Body() body: RegisterUserSubscriptionRequestDto,
    @GetUser() user: TokenPayload,
  ) {
    return this.subscriptionUseCases.registerUserSubscription(
      user.userId,
      body.subscriptionId,
      body.provider,
    );
  }
}
