import { Module } from "@nestjs/common";
import { OrganizationInvitationUseCase } from "./organization-intivation.use-case";
import { PostgresDataServicesModule } from "@/frameworks/data-services/postgres/postgres-data-services.module";

@Module({
  imports: [PostgresDataServicesModule],
  providers: [OrganizationInvitationUseCase],
  exports: [OrganizationInvitationUseCase],
})
export class OrganizationInvitationUseCaseModule {}
