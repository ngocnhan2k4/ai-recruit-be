import { Injectable, Logger } from "@nestjs/common";
import { ApiResponse, CompanySimpleResponseDto } from "@/interfaces/dtos";
import { CreateCompanyDto } from "@/interfaces/dtos";
import { RESPONSE_CODE } from "@/common/constants/response";
import { Company, ICompanyRepository } from "@/core";

@Injectable()
export class CompanyUseCase {
  constructor(private readonly companyRepository: ICompanyRepository) {}

  private readonly logger = new Logger(CompanyUseCase.name);

  async getSimpleCompanies(): Promise<ApiResponse<CompanySimpleResponseDto[]>> {
    const data = await this.companyRepository.getAllSimple();
    this.logger.log(`Fetched ${data.length} companies`);
    return {
      message: "Companies fetched successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: data,
    };
  }

  async getAllCompanies(): Promise<
    ApiResponse<Pick<Company, "id" | "name" | "logoUrl" | "address">[]>
  > {
    const result = await this.companyRepository.getAllCompanies();

    return {
      message: "Companies retrieved successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: result,
    };
  }

  async createCompany(data: CreateCompanyDto): Promise<ApiResponse<Company>> {
    const company = await this.companyRepository.create({
      name: data.name,
    });

    return {
      message: "Company created successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: company,
    };
  }
}
