import { Module } from "@nestjs/common";
import { ElasticsearchModule } from "../data-services/elasticsearch/elasticsearch.module";
import { MessageQueueModule } from "../message-queue/message-queue.module";
import { JobMatchingScheduler } from "./job.scheduler";
import { JobIndexWorker } from "./job-index.worker";
import { LoggerServiceModule } from "../logger-services/logger.module";
import { JobMatchingUseCasesModule } from "@/use-cases/job-matching/job-matching.use-cases.module";

@Module({
  imports: [
    ElasticsearchModule,
    MessageQueueModule,
    LoggerServiceModule,
    JobMatchingUseCasesModule,
  ],
  providers: [JobMatchingScheduler, JobIndexWorker],
})
export class JobMatchingSchedulerModule {}
