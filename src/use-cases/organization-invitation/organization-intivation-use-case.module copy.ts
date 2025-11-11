import { Module } from "@nestjs/common";
import { OrganizationInvitationUseCase } from "./organization-intivation.use-case";
import { PostgresDataServicesModule } from "@/frameworks/data-services/postgres/postgres-data-services.module";
import { NotificationModule } from "@/frameworks/notification/notification.module";

@Module({
  imports: [PostgresDataServicesModule, NotificationModule],
  providers: [OrganizationInvitationUseCase],
  exports: [OrganizationInvitationUseCase],
})
export class OrganizationInvitationUseCaseModule {}
