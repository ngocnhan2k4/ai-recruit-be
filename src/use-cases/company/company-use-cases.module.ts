import { Module } from "@nestjs/common";
import { CompanyUseCase } from "./company.use-case";
import { PostgresDataServicesModule } from "../../frameworks/data-services/postgres/postgres-data-services.module";

@Module({
  imports: [PostgresDataServicesModule],
  providers: [CompanyUseCase],
  exports: [CompanyUseCase],
})
export class CompanyUseCasesModule {}
