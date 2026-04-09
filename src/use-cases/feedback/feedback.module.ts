import { Module } from "@nestjs/common";
import { FeedbackUseCase } from "./feedback.use-case";
import { NotificationModule } from "@/frameworks/notification/notification.module";
import { MessageQueueModule } from "@/frameworks/message-queue/message-queue.module";

@Module({
  imports: [NotificationModule, MessageQueueModule],
  providers: [FeedbackUseCase],
  exports: [FeedbackUseCase],
})
export class FeedbackUseCasesModule {}
