import { Module } from "@nestjs/common";
import { OrganizationInvitationUseCase } from "./organization-intivation.use-case";
import { PostgresDataServicesModule } from "@/frameworks/data-services/postgres/postgres-data-services.module";
import { NotificationModule } from "@/frameworks/notification/notification.module";
import { EmailModule } from "@/frameworks/email-services/email.module";

@Module({
  imports: [PostgresDataServicesModule, NotificationModule, EmailModule],
  providers: [OrganizationInvitationUseCase],
  exports: [OrganizationInvitationUseCase],
})
export class OrganizationInvitationUseCaseModule {}
