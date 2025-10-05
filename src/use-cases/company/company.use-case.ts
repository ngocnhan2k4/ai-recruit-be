import { Injectable, Logger } from "@nestjs/common";
import { ICompanyRepository } from "../../core/abstracts";
import { ApiResponse, CompanySimpleDto } from "@/interfaces/dtos";
import { RESPONSE_CODE } from "@/common/constants/response";

@Injectable()
export class CompanyUseCases {
  private readonly logger = new Logger(CompanyUseCases.name);
  constructor(private readonly companyRepository: ICompanyRepository) {}

  async getCompanies(): Promise<ApiResponse<CompanySimpleDto[]>> {
    const data = await this.companyRepository.getAllSimple();
    this.logger.log(`Fetched ${data.length} companies`);
    return {
      message: "Companies fetched successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: data,
    };
  }
}
