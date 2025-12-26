import { Module } from "@nestjs/common";
import { RedisModule } from "../redis/redis.module";
import { MessageQueueService } from "./message-queue.service";
import { IMessageQueueService } from "@/core/abstracts/message-queue.abstract";
import { BullModule } from "@nestjs/bullmq";
import { JOB_INDEX_QUEUE } from "@/common/constants/queue";

@Module({
  imports: [
    RedisModule,
    BullModule.registerQueue({
      name: JOB_INDEX_QUEUE,
    }),
  ],
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
