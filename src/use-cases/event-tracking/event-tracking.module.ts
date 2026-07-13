import { Module } from "@nestjs/common";
import { EventTrackingController } from "../../interfaces/controllers/event-tracking/event-tracking.controller";
import { EventTrackingService } from "./event-tracking.service";
import { RedisModule } from "@/frameworks/redis/redis.module";
import { ElasticsearchModule } from "@/frameworks/data-services/elasticsearch/elasticsearch.module";

@Module({
  imports: [RedisModule, ElasticsearchModule],
  controllers: [EventTrackingController],
  providers: [EventTrackingService],
  exports: [EventTrackingService],
})
export class EventTrackingModule {}
