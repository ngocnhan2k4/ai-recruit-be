import { Module } from "@nestjs/common";
import { NotificationService } from "./notification.service";
import { WebSocketModule } from "../websocket/websocket.module";
import { PostgresDataServicesModule } from "../data-services/postgres/postgres-data-services.module";
import { INotificationService } from "@/core/abstracts/notification.abstract";
import { NotificationRendererService } from "./notification-renderer.service";

@Module({
  providers: [
    NotificationService,
    NotificationRendererService,
    {
      provide: INotificationService,
      useClass: NotificationService,
    },
  ],
  imports: [WebSocketModule, PostgresDataServicesModule],
  exports: [
    NotificationService,
    NotificationRendererService,
    INotificationService,
  ],
})
export class NotificationModule {}
