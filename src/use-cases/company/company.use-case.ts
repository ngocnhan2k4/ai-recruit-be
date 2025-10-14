import { Injectable, Logger } from "@nestjs/common";
import { ApiResponse } from "@/interfaces/dtos";
import { CreateCompanyDto } from "@/interfaces/dtos";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants/response";
import { Company, ICompanyRepository } from "@/core";
import { PaginatedResult } from "@/common/types/api";

@Injectable()
export class CompanyUseCase {
  constructor(private readonly companyRepository: ICompanyRepository) {}

  private readonly logger = new Logger(CompanyUseCase.name);

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

  async getCompanies(
    limit = 20,
    keyword?: string,
    cursor?: string,
  ): Promise<
    ApiResponse<
      PaginatedResult<Pick<Company, "id" | "name" | "logoUrl" | "address">>
    >
  > {
    const result = await this.companyRepository.getCompanies(
      limit,
      keyword,
      cursor,
    );
    return {
      message: RESPONSE_MESSAGE.SUCCESS,
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
