import { Module } from "@nestjs/common";
import { DataServicesModule } from "@/services/data-services/data-services.module";
import { CategoryUseCases } from "./category.use-case";

@Module({
  imports: [DataServicesModule],
  providers: [CategoryUseCases],
  exports: [CategoryUseCases],
})
export class CategoryUseCasesModule {}
