import { Module } from "@nestjs/common";
import { ElasticsearchModule } from "../data-services/elasticsearch/elasticsearch.module";
import { MessageQueueModule } from "../message-queue/message-queue.module";
import { JobMatchingScheduler } from "./job.scheduler";
import { JobIndexWorker } from "./job-index.worker";
import { TaskWorker } from "./task.worker";
import { EmailWorker } from "./email.worker";
import { LoggerServiceModule } from "../logger-services/logger.module";
import { JobMatchingUseCasesModule } from "@/use-cases/job-matching/job-matching.use-cases.module";
import { JobSyncUseCaseModule } from "@/use-cases/job-sync/job-sync.use-case.module";
import { AIServicesModule } from "@/frameworks/ai-services/ai-services.module";
import { PostgresDataServicesModule } from "@/frameworks/data-services/postgres/postgres-data-services.module";
import { WebSocketModule } from "@/frameworks/websocket/websocket.module";
import { EmailModule } from "@/frameworks/email-services/email.module";
import { UserScheduler } from "./user.scheduler";
import { UserUseCasesModule } from "@/use-cases/user/user-use-cases.module";
import { RedisModule } from "@/frameworks/redis/redis.module";
import { BlogScheduler } from "./blog.scheduler";

@Module({
  imports: [
    ElasticsearchModule,
    MessageQueueModule,
    LoggerServiceModule,
    JobMatchingUseCasesModule,
    JobSyncUseCaseModule,
    AIServicesModule,
    PostgresDataServicesModule,
    WebSocketModule,
    EmailModule,
    UserUseCasesModule,
    RedisModule,
  ],
  providers: [
    JobMatchingScheduler,
    JobIndexWorker,
    TaskWorker,
    EmailWorker,
    UserScheduler,
    BlogScheduler,
  ],
})
export class JobMatchingSchedulerModule {}
