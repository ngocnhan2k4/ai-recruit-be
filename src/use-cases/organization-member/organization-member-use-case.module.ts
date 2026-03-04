import { Module } from "@nestjs/common";
import { OrganizationMemberUseCase } from "./organization-member.use-case";
import { PostgresDataServicesModule } from "@/frameworks/data-services/postgres/postgres-data-services.module";
import { CasbinModule } from "@/frameworks/auth-services/casbin/casbin.module";

@Module({
  imports: [PostgresDataServicesModule, CasbinModule],
  providers: [OrganizationMemberUseCase],
  exports: [OrganizationMemberUseCase],
})
export class OrganizationMemberUseCasesModule {}
