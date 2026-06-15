import { Controller, Post, Body, Delete, Param } from "@nestjs/common";
import { EventTrackingService } from "../../../use-cases/event-tracking/event-tracking.service";
import { CreateTrackingEventRequestDto } from "../../dtos/event-tracking/event-tracking.dto";
import { ApiTags, ApiOperation } from "@nestjs/swagger";

@ApiTags("Event Tracking")
@Controller("events")
export class EventTrackingController {
  constructor(private readonly eventTrackingService: EventTrackingService) {}

  @Post("/tracking")
  @ApiOperation({ summary: "Track user event" })
  trackEvent(@Body() dto: CreateTrackingEventRequestDto) {
    // Fire and forget
    this.eventTrackingService.trackEvent(dto).catch((err) => {
      console.error("Failed to track event:", err);
    });
    return { success: true };
  }

  @Delete("/tracking/:userId")
  @ApiOperation({ summary: "Clear user tracking data for testing" })
  async clearUserData(@Param("userId") userId: string) {
    await this.eventTrackingService.clearUserData(userId);
    return { success: true };
  }
}
