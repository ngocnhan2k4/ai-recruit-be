import { Module } from "@nestjs/common";
import { WebSocketGateway } from "./websocket.gateway";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [JwtModule, ConfigModule],
  providers: [
    WebSocketGateway,
    {
      provide: "IWebSocketGateway",
      useClass: WebSocketGateway,
    },
  ],
  exports: [WebSocketGateway, "IWebSocketGateway"],
})
export class WebSocketModule {}
