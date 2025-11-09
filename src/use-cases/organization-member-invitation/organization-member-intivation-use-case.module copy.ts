import { Module } from "@nestjs/common";
import { OrganizationMemberInvitationUseCase } from "./organization-member-intivation.use-case";
import { PostgresDataServicesModule } from "@/frameworks/data-services/postgres/postgres-data-services.module";

@Module({
  imports: [PostgresDataServicesModule],
  providers: [OrganizationMemberInvitationUseCase],
  exports: [OrganizationMemberInvitationUseCase],
})
export class OrganizationMemberInvitationUseCaseModule {}
