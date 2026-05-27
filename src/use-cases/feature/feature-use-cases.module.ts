import { Module } from "@nestjs/common";
import { PostgresDataServicesModule } from "@/frameworks/data-services/postgres/postgres-data-services.module";
import { FeatureUseCases } from "./feature.use-case";
import { MessageQueueModule } from "@/frameworks/message-queue/message-queue.module";

@Module({
  imports: [PostgresDataServicesModule, MessageQueueModule],
  providers: [FeatureUseCases],
  exports: [FeatureUseCases],
})
export class FeatureUseCasesModule {}
