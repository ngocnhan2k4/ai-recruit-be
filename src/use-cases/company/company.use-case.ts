import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ApiResponse, CompanySimpleResponseDto } from "@/interfaces/dtos";
import { CreateCompanyDto } from "@/interfaces/dtos";
import { RESPONSE_CODE } from "@/common/constants/response";
import { Company, ICompanyRepository } from "@/core";
import { OrganizationRole } from "@/common/constants/organization-roles";
import { IOrganizationMembersRepository } from "@/core/abstracts/repositories/organization-members.abstract";
import { NotFoundError } from "rxjs";

@Injectable()
export class CompanyUseCase {
  constructor(
    private readonly companyRepository: ICompanyRepository,
    private readonly organizationMembersRepository: IOrganizationMembersRepository,
  ) {}

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

  async createCompany(
    userId: string,
    data: CreateCompanyDto,
  ): Promise<ApiResponse<Company>> {
    try {
      const organization = await this.companyRepository.create({
        ...data,
      });
      const organizationMember =
        await this.organizationMembersRepository.create({
          userId: userId,
          organizationId: organization.id,
          role: OrganizationRole.ORGANIZATION_OWNER,
        });
      return {
        message: "Company created successfully",
        code: RESPONSE_CODE.SUCCESS,
        data: organization,
      };
    } catch (error) {
      this.logger.error(`Error creating company: ${error.message}`);
      throw error;
    }
  }

  async getCompaniesByUserId(
    userId: string,
    limit: number,
    cursor: string,
  ): Promise<ApiResponse<Partial<Company>[]>> {
    const res = await this.companyRepository.getCompaniesByUserId(
      userId,
      limit,
      cursor,
    );
    return {
      message: "Companies fetched successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: res.data.map((company) => ({
        id: company.id,
        name: company.name,
        logoUrl: company.logoUrl,
        description: company.description,
        role: company.role,
        foundingYear: company.foundingYear,
      })),
    };
  }

  async getCompany(
    userId?: string,
    companyId?: string,
  ): Promise<ApiResponse<Company & { role: string }>> {
    if (!companyId) {
      throw new NotFoundException("Company ID is required");
    }
    const company = await this.companyRepository.get(companyId);
    if (!company) {
      throw new NotFoundException("Company not found");
    }
    const role = userId
      ? await this.organizationMembersRepository
          .findMemberByUserIdAndOrganizationId(userId, companyId)
          .then((member) =>
            member ? member.role : OrganizationRole.ANONYMOUSLY,
          )
      : OrganizationRole.ANONYMOUSLY;

    return {
      data: { ...company, role },
      message: "Company fetched successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }
}
