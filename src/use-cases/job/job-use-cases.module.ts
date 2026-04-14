import { Module } from "@nestjs/common";
import { JobUseCases } from "./job.use-case";
import { WebSocketModule } from "@/frameworks/websocket/websocket.module";
import { MessageQueueModule } from "@/frameworks/message-queue/message-queue.module";
import { PostgresDataServicesModule } from "@/frameworks/data-services/postgres/postgres-data-services.module";

@Module({
  imports: [WebSocketModule, MessageQueueModule, PostgresDataServicesModule],
  providers: [JobUseCases],
  exports: [JobUseCases],
})
export class JobUseCasesModule {}
