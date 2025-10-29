import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CompanyUseCase } from "@/use-cases/company/company.use-case";

@ApiTags("Companies Public")
@Controller("companies")
export class CompanyController {
  constructor(private readonly companyUseCase: CompanyUseCase) {}
}
