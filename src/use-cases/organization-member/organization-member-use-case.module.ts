import { Module } from "@nestjs/common";
import { OrganizationMemberUseCase } from "./organization-member.use-case";
import { PostgresDataServicesModule } from "@/frameworks/data-services/postgres/postgres-data-services.module";

@Module({
  imports: [PostgresDataServicesModule],
  providers: [OrganizationMemberUseCase],
  exports: [OrganizationMemberUseCase],
})
export class OrganizationMemberUseCasesModule {}
