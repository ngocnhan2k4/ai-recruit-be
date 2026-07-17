import { Module } from "@nestjs/common";
import { NotificationUseCase } from "./notification.use-case";
import { NotificationModule } from "@/frameworks/notification/notification.module";
import { PostgresDataServicesModule } from "@/frameworks/data-services/postgres/postgres-data-services.module";

@Module({
  imports: [NotificationModule, PostgresDataServicesModule],
  providers: [NotificationUseCase],
  exports: [NotificationUseCase],
})
export class NotificationUseCasesModule {}
