import { Module } from "@nestjs/common";
import { JobUseCases } from "./job.use-case";
import { WebSocketModule } from "@/frameworks/websocket/websocket.module";
import { MessageQueueModule } from "@/frameworks/message-queue/message-queue.module";
import { PostgresDataServicesModule } from "@/frameworks/data-services/postgres/postgres-data-services.module";
import { FeatureModule } from "@/services";
import { ElasticsearchModule } from "@/frameworks/data-services/elasticsearch/elasticsearch.module";
import { ConfigModule } from "@nestjs/config";
import { CvModule } from "@/services/cv/cv.module";

@Module({
  imports: [
    WebSocketModule,
    MessageQueueModule,
    PostgresDataServicesModule,
    FeatureModule,
    ElasticsearchModule,
    ConfigModule,
    CvModule,
  ],
  providers: [JobUseCases],
  exports: [JobUseCases],
})
export class JobUseCasesModule {}
