import { Module } from "@nestjs/common";
import { RedisModule } from "../redis/redis.module";
import { MessageQueueService } from "./message-queue.service";
import { IMessageQueueService } from "@/core/abstracts/message-queue.abstract";

@Module({
  imports: [RedisModule],
  providers: [
    MessageQueueService,
    {
      provide: IMessageQueueService,
      useClass: MessageQueueService,
    },
  ],
  exports: [IMessageQueueService],
})
export class MessageQueueModule {}
