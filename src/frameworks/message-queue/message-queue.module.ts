import { Module } from "@nestjs/common";
import { MessageQueueService } from "./message-queue.service";
import { IMessageQueueService } from "@/core/abstracts/message-queue.abstract";
import { BullModule } from "@nestjs/bullmq";
import {
  ACTIVITY_LOG_QUEUE,
  CV_INDEX_QUEUE,
  EMAIL_QUEUE,
  JOB_INDEX_QUEUE,
  SCORE_CV_QUEUE,
  TASK_QUEUE,
} from "@/common/constants";
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
          db: configService.get<number>("REDIS_DB"),
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
    BullModule.registerQueue({
      name: EMAIL_QUEUE,
    }),
    BullModule.registerQueue({
      name: CV_INDEX_QUEUE,
    }),
    BullModule.registerQueue({
      name: SCORE_CV_QUEUE,
    }),
    BullModule.registerFlowProducer({
      name: "cv_score_flow",
    }),
    BullModule.registerQueue({
      name: ACTIVITY_LOG_QUEUE,
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
