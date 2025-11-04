import { OrganizationUseCase } from "@/use-cases/organization/organization.use-case";
import { Controller, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards/jwt-auth.guard";
import { OrganizationAuthorizeGuard } from "@/frameworks/auth-services/guards/organization-authorize.guard";

@ApiTags("Organization Admin")
@Controller("organizations/:orgId")
@UseGuards(JwtAuthGuard, OrganizationAuthorizeGuard)
export class OrganizationAdminController {
  constructor(private readonly organizationUseCase: OrganizationUseCase) {}
}
