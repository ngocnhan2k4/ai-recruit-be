import { Module } from "@nestjs/common";
import { CategoryUseCases } from "./category.use-case";
import { PostgresDataServicesModule } from "../../frameworks/data-services/postgres/postgres-data-services.module";

@Module({
  imports: [PostgresDataServicesModule],
  providers: [CategoryUseCases],
  exports: [CategoryUseCases],
})
export class CategoryUseCasesModule {}
