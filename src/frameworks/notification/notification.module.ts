import { Module } from "@nestjs/common";
import { NotificationService } from "./notification.service";
import { WebSocketModule } from "../websocket/websocket.module";
import { PostgresDataServicesModule } from "../data-services/postgres/postgres-data-services.module";

@Module({
  providers: [
    NotificationService,
    {
      provide: "INotificationService",
      useClass: NotificationService,
    },
  ],
  imports: [WebSocketModule, PostgresDataServicesModule],
  exports: [NotificationService, "INotificationService"],
})
export class NotificationModule {}
