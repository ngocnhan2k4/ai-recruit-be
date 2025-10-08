import { Module } from "@nestjs/common";
import { CategoryUseCases } from "./category.use-case";

@Module({
  providers: [CategoryUseCases],
  exports: [CategoryUseCases],
})
export class CategoryUseCasesModule {}
