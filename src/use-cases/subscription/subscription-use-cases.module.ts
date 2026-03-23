import { Module } from "@nestjs/common";
import { PostgresDataServicesModule } from "@/frameworks/data-services/postgres/postgres-data-services.module";
import { SubscriptionUseCases } from "./subscription.use-case";

@Module({
  imports: [PostgresDataServicesModule],
  providers: [SubscriptionUseCases],
  exports: [SubscriptionUseCases],
})
export class SubscriptionUseCasesModule {}
