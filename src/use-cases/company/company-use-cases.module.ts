import { Module } from "@nestjs/common";
import { CompanyUseCases } from "./company.use-case";

@Module({
  providers: [CompanyUseCases],
  exports: [CompanyUseCases],
})
export class CompanyUseCasesModule {}
