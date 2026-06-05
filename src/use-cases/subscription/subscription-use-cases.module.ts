import { Module } from "@nestjs/common";
import { PostgresDataServicesModule } from "@/frameworks/data-services/postgres/postgres-data-services.module";
import { SubscriptionUseCases } from "./subscription.use-case";
import { PaymentServicesModule } from "@/frameworks/payment-services/payment-services.module";
import { ExchangeRateModule } from "@/frameworks/exchange-rate/exchange-rate.module";

@Module({
  imports: [
    PostgresDataServicesModule,
    PaymentServicesModule,
    ExchangeRateModule,
  ],
  providers: [SubscriptionUseCases],
  exports: [SubscriptionUseCases],
})
export class SubscriptionUseCasesModule {}
