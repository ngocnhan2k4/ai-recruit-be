import { Controller, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CompanyUseCase } from "@/use-cases/company/company.use-case";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards/jwt-auth.guard";
import { SystemAuthorizeGuard } from "@/frameworks/auth-services/guards/system-authorize.guard";
@ApiTags("Companies Admin")
@Controller("admin/companies")
@UseGuards(JwtAuthGuard, SystemAuthorizeGuard)
export class CompanyAdminController {
  constructor(private readonly companyUseCase: CompanyUseCase) {}
}
