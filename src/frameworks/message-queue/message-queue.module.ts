import { Module } from "@nestjs/common";
import { MessageQueueService } from "./message-queue.service";
import { IMessageQueueService } from "@/core/abstracts/message-queue.abstract";
import { BullModule } from "@nestjs/bullmq";
import { JOB_INDEX_QUEUE, TASK_QUEUE } from "@/common/constants";
import { ConfigModule, ConfigService } from "@nestjs/config";

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>("REDIS_HOST"),
          port: configService.get<number>("REDIS_PORT"),
          password: configService.get<string>("REDIS_PASSWORD"),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: JOB_INDEX_QUEUE,
    }),
    BullModule.registerQueue({
      name: TASK_QUEUE,
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
