import { Module } from "@nestjs/common";
import { JobUseCases } from "./job.use-case";
import { PostgresDataServicesModule } from "../../frameworks/data-services/postgres/postgres-data-services.module";

@Module({
  imports: [PostgresDataServicesModule],
  providers: [JobUseCases],
  exports: [JobUseCases],
})
export class JobUseCasesModule {}
