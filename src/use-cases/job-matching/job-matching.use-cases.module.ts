import { Module } from "@nestjs/common";
import { JobMatchingUseCases } from "./job-matching.use-cases";
import { ElasticsearchModule } from "@/frameworks/data-services/elasticsearch/elasticsearch.module";
import { MessageQueueModule } from "@/frameworks/message-queue/message-queue.module";
import { EventTrackingModule } from "../event-tracking/event-tracking.module";
import { BloomFilterModule } from "@/frameworks/bloom-filter/bloom-filter.module";

@Module({
  imports: [
    MessageQueueModule,
    ElasticsearchModule,
    EventTrackingModule,
    BloomFilterModule,
  ],
  providers: [JobMatchingUseCases],
  exports: [JobMatchingUseCases],
})
export class JobMatchingUseCasesModule {}
