import { Module } from "@nestjs/common";
import { OrganizationUseCase } from "./organization.use-case";

@Module({
  providers: [OrganizationUseCase],
  exports: [OrganizationUseCase],
})
export class OrganizationUseCasesModule {}
