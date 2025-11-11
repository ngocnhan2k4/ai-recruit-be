import { Module } from "@nestjs/common";
import { JobUseCases } from "./job.use-case";
import { PostgresDataServicesModule } from "../../frameworks/data-services/postgres/postgres-data-services.module";
import { NotificationModule } from "@/frameworks/notification/notification.module";
import { WebSocketModule } from "@/frameworks/websocket/websocket.module";

@Module({
  imports: [PostgresDataServicesModule, NotificationModule, WebSocketModule],
  providers: [JobUseCases],
  exports: [JobUseCases],
})
export class JobUseCasesModule {}
