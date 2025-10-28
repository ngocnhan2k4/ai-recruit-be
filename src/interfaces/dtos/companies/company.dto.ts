import {
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsArray,
  IsNumber,
  ValidateNested,
} from "class-validator";
import { GeneralQueryDto } from "../common/query";
import { ApiProperty } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";

import {
  OrganizationDto,
  UpdateOrganizationDto,
} from "../organization/organization.dto";

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

export class GetCompaniesQueryDto extends GeneralQueryDto {
  @ApiProperty({ type: "number", nullable: true })
  @IsOptional()
  @Type(() => Number)
  employeeMin?: number;

  @ApiProperty({ type: "number", nullable: true })
  @IsOptional()
  @Type(() => Number)
  employeeMax?: number;

  @ApiProperty({ type: "boolean", nullable: true })
  @IsOptional()
  @Transform(({ value }) =>
    value === "true" ? true : value === "false" ? false : undefined,
  )
  verified?: boolean;

  @ApiProperty({ type: [String], nullable: true })
  @IsArray()
  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : undefined,
  )
  provinceIds?: string[];
}

export class CompanyWithOrganizationDto {
  @ApiProperty({ type: CompanyDto })
  @IsNotEmpty()
  company: CompanyDto;
  @ApiProperty({ type: OrganizationDto })
  organization: OrganizationDto;
}

export class CreateCompanyDto {
  @ApiProperty({
    description: "Company size",
    type: "number",
    example: 100,
  })
  @IsNotEmpty({ message: "Company size is required" })
  @IsNumber({}, { message: "Company size must be a number" })
  companySize: number;

  @ApiProperty({
    description: "Company tax code",
    type: "string",
    example: "123-45-6789",
  })
  @IsNotEmpty({ message: "Tax code is required" })
  @IsString({ message: "Tax code must be a string" })
  @MaxLength(100, { message: "Tax code must not exceed 100 characters" })
  @MinLength(2, { message: "Tax code must be at least 2 characters long" })
  taxCode: string;

  @ApiProperty({
    description: "Company benefits",
    type: "array",
    items: { type: "string" },
    example: "Health insurance Paid time off, 401(k) matching",
  })
  @IsOptional()
  benefits?: string;
}

export class UpdateCompanyDto {
  @ApiProperty({
    description: "Company size",
    type: "number",
    example: 100,
  })
  @IsOptional()
  @IsNumber({}, { message: "Company size must be a number" })
  companySize?: number;

  @ApiProperty({
    description: "Company tax code",
    type: "string",
    example: "123-45-6789",
  })
  @IsOptional()
  @IsString({ message: "Tax code must be a string" })
  @MaxLength(100, { message: "Tax code must not exceed 100 characters" })
  @MinLength(2, { message: "Tax code must be at least 2 characters long" })
  taxCode?: string;

  @ApiProperty({
    description: "Company benefits",
    type: "array",
    items: { type: "string" },
    example: "Health insurance Paid time off, 401(k) matching",
  })
  @IsOptional()
  @IsString({ message: "Benefits must be a string" })
  @MaxLength(255, { message: "Benefits must not exceed 255 characters" })
  @MinLength(2, { message: "Benefits must be at least 2 characters long" })
  benefits?: string;

  @ApiProperty({
    description: "Company raw id",
    type: "number",
    example: 123,
  })
  @IsOptional()
  @IsNumber({}, { message: "Company raw id must be a number" })
  companyRawId?: number;
}

export class UpdateCompanyWithOrganizationDto {
  @ApiProperty({ type: UpdateCompanyDto })
  @ValidateNested()
  @Type(() => UpdateCompanyDto)
  company: UpdateCompanyDto;
  @ApiProperty({ type: UpdateOrganizationDto })
  @ValidateNested()
  @Type(() => UpdateOrganizationDto)
  organization: UpdateOrganizationDto;
}

export class GetCompanyDto extends CompanyDto {
  role: string;
}

export class CheckOrganizationNameResponseDto {
  @ApiProperty()
  exists: boolean;
}
