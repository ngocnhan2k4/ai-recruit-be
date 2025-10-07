import { Injectable } from "@nestjs/common";
import { Company, ICompanyRepository } from "@/core";
import { ApiResponse, CreateCompanyDto } from "@/interfaces/dtos";
import { RESPONSE_CODE } from "@/common/constants/response";

@Injectable()
export class CompanyUseCase {
  constructor(private readonly companyRepository: ICompanyRepository) {}

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
