import { Module } from "@nestjs/common";
import { JobUseCases } from "./job.use-case";
import { WebSocketModule } from "@/frameworks/websocket/websocket.module";
import { MessageQueueModule } from "@/frameworks/message-queue/message-queue.module";

@Module({
  imports: [WebSocketModule, MessageQueueModule],
  providers: [JobUseCases],
  exports: [JobUseCases],
})
export class JobUseCasesModule {}
