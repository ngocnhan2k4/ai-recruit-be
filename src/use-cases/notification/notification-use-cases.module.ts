import { Module } from "@nestjs/common";
import { NotificationUseCase } from "./notification.use-case";
import { NotificationModule } from "@/frameworks/notification/notification.module";

@Module({
  imports: [NotificationModule],
  providers: [NotificationUseCase],
  exports: [NotificationUseCase],
})
export class NotificationUseCasesModule {}
