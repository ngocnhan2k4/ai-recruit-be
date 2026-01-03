import {
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsNumber,
  ValidateNested,
} from "class-validator";
import { GeneralQueryDto } from "../../common/query";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
} from "@/interfaces/dtos";

export class GetCompaniesQueryDto extends GeneralQueryDto {
  // [TODO]: legacy code, remove it later
}

export class CreateCompanyDto {
  @ApiProperty({
    description: "Company size",
    type: "number",
    example: 100,
  })
  @IsNumber({}, { message: "Company size must be a number" })
  companySize?: number;

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
    description: "Company culture",
    type: "string",
    example: "Innovative and inclusive work environment",
  })
  @IsString({ message: "Culture must be a string" })
  @MaxLength(500, { message: "Culture must not exceed 500 characters" })
  @MinLength(2, { message: "Culture must be at least 2 characters long" })
  culture?: string;

  @ApiProperty({
    description: "Company benefits",
    type: "array",
    items: { type: "string" },
    example: "Health insurance Paid time off, 401(k) matching",
  })
  @IsOptional()
  benefits?: string;
}

export class CreateCompanyWithOrganizationDto {
  @ApiProperty({ type: CreateCompanyDto })
  @IsNotEmpty({ message: "Company is required" })
  @IsString()
  company: CreateCompanyDto;
  @ApiProperty({ type: CreateOrganizationDto })
  @IsNotEmpty({ message: "Organization is required" })
  @IsString()
  organization: CreateOrganizationDto;
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
