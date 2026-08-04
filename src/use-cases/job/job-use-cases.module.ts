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
import { NotificationModule } from "@/frameworks/notification/notification.module";
import { AIServicesModule } from "@/frameworks/ai-services/ai-services.module";
import { JobCopilotUseCase } from "../job-copilot/job-copilot.use-case";
import { JobCopilotDraftUseCase } from "../job-copilot/job-copilot-draft.use-case";
import { CandidateBriefUseCase } from "../candidate-brief/candidate-brief.use-case";
import { JobCopilotChatUseCase } from "../job-copilot/job-copilot-chat.use-case";

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
    NotificationModule,
    AIServicesModule,
  ],
  providers: [
    JobUseCases,
    JobCopilotUseCase,
    JobCopilotDraftUseCase,
    CandidateBriefUseCase,
    JobCopilotChatUseCase,
  ],
  exports: [
    JobUseCases,
    JobCopilotUseCase,
    JobCopilotDraftUseCase,
    CandidateBriefUseCase,
    JobCopilotChatUseCase,
  ],
})
export class JobUseCasesModule {}
