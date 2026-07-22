import { Module } from "@nestjs/common";
import { WebSocketGateway } from "./websocket.gateway";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule } from "@nestjs/config";
import { IWebSocketGateway } from "@/core/abstracts/websocket.abstract";
import { PostgresDataServicesModule } from "../data-services/postgres/postgres-data-services.module";
import { NotificationRendererService } from "../notification/notification-renderer.service";

@Module({
  imports: [JwtModule, ConfigModule, PostgresDataServicesModule],
  providers: [
    WebSocketGateway,
    NotificationRendererService,
    {
      provide: IWebSocketGateway,
      useClass: WebSocketGateway,
    },
  ],
  exports: [WebSocketGateway, IWebSocketGateway],
})
export class WebSocketModule {}
