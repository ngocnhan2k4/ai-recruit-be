import { Module } from "@nestjs/common";
import { UniversityUseCases } from "./university.use-case";
import { PostgresDataServicesModule } from "../../frameworks/data-services/postgres/postgres-data-services.module";

@Module({
  imports: [PostgresDataServicesModule],
  providers: [UniversityUseCases],
  exports: [UniversityUseCases],
})
export class UniversityUseCasesModule {}
