import {
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Min,
} from "class-validator";
import { GeneralQueryDto } from "../common/query";
import { ApiProperty } from "@nestjs/swagger";

export class CompanyDto {
  @ApiProperty({ type: "string", format: "uuid" })
  id: string;

  @ApiProperty({ type: "string" })
  name: string;

  @ApiProperty({ type: "string", nullable: true })
  logoUrl: string | null;

  @ApiProperty({ type: "string", nullable: true })
  description: string | null;

  @ApiProperty({ type: "array", items: { type: "string" }, nullable: true })
  address: string[] | null;

  @ApiProperty({ type: "number" })
  employeesMin: number | null;

  @ApiProperty({ type: "number" })
  employeesMax: number | null;

  @ApiProperty({ type: "string", nullable: true })
  websiteUrl: string | null;
}

export class GetCompaniesQueryDto extends GeneralQueryDto {}

export class CreateCompanyDto {
  @ApiProperty({
    description: "Company name",
    type: "string",
    example: "Tech Company Ltd",
    minLength: 2,
    maxLength: 255,
  })
  @IsNotEmpty({ message: "Company name is required" })
  @IsString({ message: "Company name must be a string" })
  @MinLength(2, { message: "Company name must be at least 2 characters long" })
  @MaxLength(255, { message: "Company name must not exceed 255 characters" })
  name: string;

  @ApiProperty({
    description: "Company logo URL",
    type: "string",
    example: "https://example.com/logo.png",
  })
  logoUrl?: string;

  @ApiProperty({
    description: "Company description",
    type: "string",
    example: "A leading tech company specializing in AI solutions.",
  })
  description?: string;

  @ApiProperty({
    description: "Company address",
    type: "array",
    items: { type: "string" },
    example: ["123 Tech Street", "Silicon Valley, CA"],
  })
  address?: string[];

  @ApiProperty({
    description: "Minimum number of employees",
    type: "number",
    example: 50,
  })
  employeesMin?: number;

  @ApiProperty({
    description: "Maximum number of employees",
    type: "number",
    example: 200,
  })
  employeesMax?: number;

  @ApiProperty({
    description: "Company website URL",
    type: "string",
    example: "https://example.com",
  })
  websiteUrl?: string;

  @ApiProperty({
    description: "Company founding year",
    type: "number",
    example: 2020,
  })
  @IsOptional()
  @Min(1800, { message: "Founding year must be after 1800" })
  foundingYear?: number;

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
    description: "Company organization culture",
    type: "string",
    example: "Innovative, Inclusive, and Customer-Centric",
  })
  organizationCulture?: string;

  @ApiProperty({
    description: "Company benefits",
    type: "array",
    items: { type: "string" },
    example: ["Health insurance", "Paid time off", "401(k) matching"],
  })
  @IsOptional()
  benefits?: string[];
}

export class CompanySimpleResponseDto {
  @ApiProperty({ type: "string", format: "uuid" })
  id: string;

  @ApiProperty({ type: "string" })
  name: string;

  @ApiProperty({ type: "string" })
  description?: string;

  @ApiProperty({ type: "string", nullable: true })
  logoUrl?: string | null;
}
