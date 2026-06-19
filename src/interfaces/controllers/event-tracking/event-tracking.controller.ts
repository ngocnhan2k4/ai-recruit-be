import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { EventTrackingService } from "../../../use-cases/event-tracking/event-tracking.service";
import { CreateTrackingEventRequestDto } from "../../dtos/event-tracking/event-tracking.dto";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { GetUser } from "@/common/decorators";
import { type TokenPayload } from "@/common/types";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards";

@ApiTags("Event Tracking")
@Controller("events")
export class EventTrackingController {
  constructor(private readonly eventTrackingService: EventTrackingService) {}

  @Post("/tracking")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Track user event" })
  trackEvent(
    @Body() dto: CreateTrackingEventRequestDto,
    @GetUser() user: TokenPayload,
  ) {
    const userId = user.userId;
    // Fire and forget
    this.eventTrackingService.trackEvent({ ...dto, userId }).catch(() => {});
    return { success: true };
  }
}
