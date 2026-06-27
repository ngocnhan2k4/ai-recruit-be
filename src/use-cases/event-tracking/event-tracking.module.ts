import { Module } from "@nestjs/common";
import { EventTrackingController } from "../../interfaces/controllers/event-tracking/event-tracking.controller";
import { EventTrackingService } from "./event-tracking.service";
import { RedisModule } from "@/frameworks/redis/redis.module";

@Module({
  imports: [RedisModule],
  controllers: [EventTrackingController],
  providers: [EventTrackingService],
  exports: [EventTrackingService],
})
export class EventTrackingModule {}
