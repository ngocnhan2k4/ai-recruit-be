import { Module } from "@nestjs/common";
import { LearningPathUseCase } from "./learning-path.use-case";
import { AIServicesModule } from "@/frameworks/ai-services/ai-services.module";
import { PostgresDataServicesModule } from "@/frameworks/data-services/postgres/postgres-data-services.module";
import { WebSocketModule } from "@/frameworks/websocket/websocket.module";
import { MessageQueueModule } from "@/frameworks/message-queue/message-queue.module";
import { FeatureModule } from "@/services";
import { NotificationModule } from "@/frameworks/notification/notification.module";

@Module({
  imports: [
    AIServicesModule,
    PostgresDataServicesModule,
    WebSocketModule,
    MessageQueueModule,
    FeatureModule,
    NotificationModule,
  ],
  providers: [LearningPathUseCase],
  exports: [LearningPathUseCase],
})
export class LearningPathUseCasesModule {}
