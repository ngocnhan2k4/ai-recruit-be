import { OrganizationUseCase } from "@/use-cases/organization/organization.use-case";
import { Controller, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards/jwt-auth.guard";
import { SystemAuthorizeGuard } from "@/frameworks/auth-services/guards";

@ApiTags("Organization Admin")
@Controller("organizations/:orgId")
@UseGuards(JwtAuthGuard, SystemAuthorizeGuard)
export class OrganizationAdminController {
  constructor(private readonly organizationUseCase: OrganizationUseCase) {}
}
