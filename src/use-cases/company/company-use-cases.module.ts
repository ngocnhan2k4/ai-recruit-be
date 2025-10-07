import { Module } from "@nestjs/common";
import { CompanyUseCase } from "./company.use-case";
@Module({
  providers: [CompanyUseCase],
  exports: [CompanyUseCase],
})
export class CompanyUseCasesModule {}
