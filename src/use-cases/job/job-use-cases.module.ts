import { Module } from "@nestjs/common";
import { JobUseCases } from "./job.use-case";
import { WebSocketModule } from "@/frameworks/websocket/websocket.module";
import { MessageQueueModule } from "@/frameworks/message-queue/message-queue.module";
import { JobMatchingQuery } from "@/frameworks/data-services/elasticsearch/queries/job-matching.query";

@Module({
  imports: [WebSocketModule, MessageQueueModule],
  providers: [JobUseCases, JobMatchingQuery],
  exports: [JobUseCases],
})
export class JobUseCasesModule {}
