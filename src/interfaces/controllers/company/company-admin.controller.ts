import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CompanyUseCase } from "@/use-cases/company/company.use-case";

@ApiTags("Companies Admin")
@Controller("admin/companies")
export class CompanyAdminController {
  constructor(private readonly companyUseCase: CompanyUseCase) {}
}
