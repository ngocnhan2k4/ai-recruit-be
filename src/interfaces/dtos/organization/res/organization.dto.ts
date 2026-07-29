import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import {
  OrganizationLocation,
  OrganizationRoleEnum,
  SchoolTypeEnum,
} from "@/core";
import { OrganizationDto } from "./organization-base.dto";

export class CheckOrganizationNameResponseDto {
  @ApiProperty()
  exists: boolean;
}

export class GetOrganizationDto extends OrganizationDto {
  @ApiProperty()
  @IsEnum(OrganizationRoleEnum)
  @IsOptional()
  role: OrganizationRoleEnum = OrganizationRoleEnum.ANONYMOUSLY;
}

export class OrganizationWithDetailsDto extends OrganizationDto {
  companySize?: number | null;
  taxCode?: string | null;
  benefits?: string | null;
  culture?: string | null;
  companyRawId?: number | null;
  schoolType?: SchoolTypeEnum | null;
  locations?: OrganizationLocation[] | null;

  @ApiProperty({ type: "number", required: false })
  activeJobsCount?: number;

  @ApiProperty({ type: "number", required: false })
  totalMembersCount?: number;

  role: OrganizationRoleEnum = OrganizationRoleEnum.ANONYMOUSLY;
}
