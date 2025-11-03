import { Module } from "@nestjs/common";
import { NotificationUseCase } from "./notification.use-case";
import { NotificationModule } from "@/frameworks/notification/notification.module";
import { WebSocketModule } from "@/frameworks/websocket/websocket.module";

@Module({
  imports: [NotificationModule, WebSocketModule],
  providers: [NotificationUseCase],
  exports: [NotificationUseCase],
})
export class NotificationUseCasesModule {}
