import { Module } from "@nestjs/common";
import { AiCvUseCases } from "./ai-cv.use-cases";
import { AIServicesModule } from "@/frameworks/ai-services/ai-services.module";
import { PostgresDataServicesModule } from "@/frameworks/data-services/postgres/postgres-data-services.module";
import { WebSocketModule } from "@/frameworks/websocket/websocket.module";
import { MessageQueueModule } from "@/frameworks/message-queue/message-queue.module";

@Module({
  imports: [
    AIServicesModule,
    PostgresDataServicesModule,
    WebSocketModule,
    MessageQueueModule,
  ],
  providers: [AiCvUseCases],
  exports: [AiCvUseCases],
})
export class AiCvUseCasesModule {}
