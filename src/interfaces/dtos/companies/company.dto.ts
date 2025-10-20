import {
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Min,
  ArrayMinSize,
  Matches,
  IsArray,
} from "class-validator";
import { GeneralQueryDto } from "../common/query";
import { ApiProperty } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";

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

  @ApiProperty({ type: "string", nullable: true })
  email: string | null;

  @ApiProperty({ type: "string", nullable: true })
  phone: string | null;

  @ApiProperty({ type: "number", nullable: true })
  foundingYear: number | null;

  @ApiProperty({ type: "string", nullable: true })
  taxCode: string | null;

  @ApiProperty({ type: "string", nullable: true })
  organizationCulture: string | null;

  @ApiProperty({ type: "string", nullable: true })
  benefits: string | null;
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
  @IsString({ message: "Logo URL must be a string" })
  @IsNotEmpty({ message: "Logo URL is required" })
  logoUrl: string;

  @ApiProperty({
    description: "Company description",
    type: "string",
    example: "A leading tech company specializing in AI solutions.",
  })
  @IsNotEmpty({ message: "Description is required" })
  @IsString({ message: "Description must be a string" })
  description: string;

  @ApiProperty({
    description: "Company address",
    type: "array",
    items: { type: "string" },
    example: ["123 Tech Street", "Silicon Valley, CA"],
  })
  @IsOptional()
  @ArrayMinSize(1, { message: "Address must contain at least one entry" })
  @IsString({ each: true, message: "Each address must be a string" })
  address?: string[];

  @ApiProperty({
    description: "Minimum number of employees",
    type: "number",
    example: 50,
  })
  @IsOptional()
  @Min(0, { message: "Minimum number of employees must be a positive number" })
  employeesMin?: number;

  @ApiProperty({
    description: "Maximum number of employees",
    type: "number",
    example: 200,
  })
  @IsOptional()
  @Min(0, { message: "Maximum number of employees must be a positive number" })
  employeesMax?: number;

  @ApiProperty({
    description: "Company website URL",
    type: "string",
    example: "https://example.com",
  })
  @IsString({ message: "Website URL must be a string" })
  @IsNotEmpty({ message: "Website URL is required" })
  websiteUrl: string;

  @ApiProperty({
    description: "Company email address",
    type: "string",
    example: "info@example.com",
  })
  @IsString({ message: "Email must be a string" })
  @IsNotEmpty({ message: "Email is required" })
  @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
    message: "Email must be a valid email address",
  })
  email: string;

  @ApiProperty({
    description: "Company phone number",
    type: "string",
    example: "+1-800-123-4567",
  })
  @IsString({ message: "Phone number must be a string" })
  @IsNotEmpty({ message: "Phone number is required" })
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: "Phone number must be a valid E.164 format",
  })
  phone: string;

  @ApiProperty({
    description: "Company founding year",
    type: "number",
    example: 2020,
  })
  @IsNotEmpty({ message: "Founding year is required" })
  @Min(1800, { message: "Founding year must be after 1800" })
  foundingYear: number;

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
  @IsOptional()
  @IsString({ message: "Organization culture must be a string" })
  organizationCulture?: string;

  @ApiProperty({
    description: "Company benefits",
    type: "array",
    items: { type: "string" },
    example: "Health insurance Paid time off, 401(k) matching",
  })
  @IsOptional()
  benefits?: string;
}

export class GetCompanyDto extends CompanyDto {
  role: string;
}
