import { Module } from "@nestjs/common";
import { ProvinceUseCases } from "./province.use-case";
import { PostgresDataServicesModule } from "../../frameworks/data-services/postgres/postgres-data-services.module";

@Module({
  imports: [PostgresDataServicesModule],
  providers: [ProvinceUseCases],
  exports: [ProvinceUseCases],
})
export class ProvinceUseCasesModule {}
