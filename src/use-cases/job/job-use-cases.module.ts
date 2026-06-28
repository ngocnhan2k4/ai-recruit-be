import { Module } from "@nestjs/common";
import { JobUseCases } from "./job.use-case";
import { WebSocketModule } from "@/frameworks/websocket/websocket.module";
import { MessageQueueModule } from "@/frameworks/message-queue/message-queue.module";
import { PostgresDataServicesModule } from "@/frameworks/data-services/postgres/postgres-data-services.module";
import { FeatureModule } from "@/services";
import { ElasticsearchModule } from "@/frameworks/data-services/elasticsearch/elasticsearch.module";
import { ConfigModule } from "@nestjs/config";
import { CvModule } from "@/services/cv/cv.module";
import { EventTrackingModule } from "../event-tracking/event-tracking.module";
import { BloomFilterModule } from "@/frameworks/bloom-filter/bloom-filter.module";

@Module({
  imports: [
    WebSocketModule,
    MessageQueueModule,
    PostgresDataServicesModule,
    FeatureModule,
    ElasticsearchModule,
    ConfigModule,
    CvModule,
    EventTrackingModule,
    BloomFilterModule,
  ],
  providers: [JobUseCases],
  exports: [JobUseCases],
})
export class JobUseCasesModule {}
