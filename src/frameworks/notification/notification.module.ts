import { Module } from "@nestjs/common";
import { NotificationService } from "./notification.service";
import { WebSocketModule } from "../websocket/websocket.module";
import { PostgresDataServicesModule } from "../data-services/postgres/postgres-data-services.module";
import { INotificationService } from "@/core/abstracts/notification.abstract";

@Module({
  providers: [
    NotificationService,
    {
      provide: INotificationService,
      useClass: NotificationService,
    },
  ],
  imports: [WebSocketModule, PostgresDataServicesModule],
  exports: [NotificationService, INotificationService],
})
export class NotificationModule {}
