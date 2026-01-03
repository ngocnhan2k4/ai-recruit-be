import { ApiProperty } from "@nestjs/swagger";
import { OrganizationDto } from "@/interfaces/dtos/organization/res/organization-base.dto";

export class CompanyDto extends OrganizationDto {
  @ApiProperty({ type: "string", format: "uuid" })
  organizationId: string;

  @ApiProperty({ type: "number" })
  companySize: number;

  @ApiProperty({ type: "string", nullable: true })
  taxCode: string | null;

  @ApiProperty({ type: "string", nullable: true })
  benefits: string | null;

  @ApiProperty({ type: "string", nullable: true })
  culture: string | null;
}

export class CompanyWithOrganizationDto {
  @ApiProperty({ type: CompanyDto })
  company: CompanyDto;
  @ApiProperty({ type: OrganizationDto })
  organization: OrganizationDto;
}

export class GetCompanyDto extends CompanyDto {
  role: string;
}
