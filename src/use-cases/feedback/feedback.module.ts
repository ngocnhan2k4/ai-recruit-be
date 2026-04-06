import { Module } from "@nestjs/common";
import { FeedbackUseCase } from "./feedback.use-case";
import { NotificationModule } from "@/frameworks/notification/notification.module";
import { EmailModule } from "@/frameworks/email-services/email.module";

@Module({
  imports: [NotificationModule, EmailModule],
  providers: [FeedbackUseCase],
  exports: [FeedbackUseCase],
})
export class FeedbackUseCasesModule {}
