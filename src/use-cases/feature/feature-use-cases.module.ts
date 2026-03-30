import { Module } from "@nestjs/common";
import { PostgresDataServicesModule } from "@/frameworks/data-services/postgres/postgres-data-services.module";
import { FeatureUseCases } from "./feature.use-case";

@Module({
  imports: [PostgresDataServicesModule],
  providers: [FeatureUseCases],
  exports: [FeatureUseCases],
})
export class FeatureUseCasesModule {}
