import { Module } from "@nestjs/common";
import { JobSyncUseCases } from "./job-sync.use-case";
import { ElasticsearchModule } from "@/frameworks/data-services/elasticsearch/elasticsearch.module";
import { MessageQueueModule } from "@/frameworks/message-queue/message-queue.module";

import { AIServicesModule } from "@/frameworks/ai-services/ai-services.module";

@Module({
  imports: [ElasticsearchModule, MessageQueueModule, AIServicesModule],
  providers: [JobSyncUseCases],
  exports: [JobSyncUseCases],
})
export class JobSyncUseCaseModule {}
