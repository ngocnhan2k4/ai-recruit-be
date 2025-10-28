import { OrganizationUseCase } from "@/use-cases/organization/organization.use-case";
import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("Organization Admin")
@Controller("admin/organizations")
export class OrganizationAdminController {
  constructor(private readonly organizationUseCase: OrganizationUseCase) {}
}
