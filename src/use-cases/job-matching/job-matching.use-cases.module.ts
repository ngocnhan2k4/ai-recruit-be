import { Module } from "@nestjs/common";
import { JobMatchingUseCases } from "./job-matching.use-cases";
import { ElasticsearchModule } from "@/frameworks/data-services/elasticsearch/elasticsearch.module";
import { JobMatchingQuery } from "@/frameworks/data-services/elasticsearch/queries/job-matching.query";
import { MessageQueueModule } from "@/frameworks/message-queue/message-queue.module";

@Module({
  imports: [MessageQueueModule, ElasticsearchModule],
  providers: [JobMatchingUseCases, JobMatchingQuery],
  exports: [JobMatchingUseCases],
})
export class JobMatchingUseCasesModule {}
