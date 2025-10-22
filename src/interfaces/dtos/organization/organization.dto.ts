import { ApiProperty } from "@nestjs/swagger";
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  MinLength,
} from "class-validator";
import { CreateCompanyDto } from "../companies/company.dto";
import { UserStatusEnum } from "..";
import { OrganizationTypeEnum } from "@/frameworks/data-services/postgres/models/enums";
import { IsEmail } from "class-validator";

export class OrganizationDto {
  @ApiProperty({ type: "string", format: "uuid" })
  @IsString()
  id: string;

  @ApiProperty({ type: "string" })
  @IsString()
  name: string;

  @ApiProperty({ type: "string" })
  @IsString()
  slug: string;

  @ApiProperty({ type: "string" })
  @IsString()
  type: string;

  @ApiProperty({ type: "string" })
  @IsString()
  description: string;

  @ApiProperty({ type: "array", items: { type: "string" } })
  @IsArray()
  address: string[];

  @ApiProperty({ type: "string" })
  @IsString()
  logoUrl: string;

  @ApiProperty({ type: "string" })
  @IsString()
  about: string;

  @ApiProperty({ type: "string" })
  @IsString()
  websiteUrl: string;

  @ApiProperty({ type: "string" })
  @IsString()
  email: string;

  @ApiProperty({ type: "string" })
  @IsString()
  phone: string;

  @ApiProperty({ type: "number" })
  @IsNumber()
  foundedYear: number;

  @ApiProperty({ type: "string" })
  @IsString()
  organizationCulture: string;

  @ApiProperty({ type: "number" })
  @IsNumber()
  employeesMin: number;

  @ApiProperty({ type: "number" })
  @IsNumber()
  employeesMax: number;

  @ApiProperty({ enum: UserStatusEnum })
  @IsEnum(UserStatusEnum)
  status: UserStatusEnum;

  @ApiProperty({ type: "string", format: "date-time" })
  createdAt: Date;

  @ApiProperty({ type: "string", format: "date-time" })
  updatedAt: Date;

  @ApiProperty({ type: "string", format: "date-time" })
  deletedAt: Date;

  @ApiProperty({ type: "string" })
  @IsString()
  verifiedAt: string;
}

export class CreateOrganizationDto {
  @ApiProperty({ type: "string" })
  @IsNotEmpty({ message: "Name is required" })
  @IsString({ message: "Name must be a string" })
  @MaxLength(255, { message: "Name must not exceed 255 characters" })
  @MinLength(2, { message: "Name must be at least 2 characters long" })
  name: string;

  @ApiProperty({ type: "string" })
  @IsNotEmpty({ message: "Slug is required" })
  @IsString({ message: "Slug must be a string" })
  @MaxLength(255, { message: "Slug must not exceed 255 characters" })
  @MinLength(2, { message: "Slug must be at least 2 characters long" })
  slug: string;

  @ApiProperty({ enum: OrganizationTypeEnum })
  @IsNotEmpty({ message: "Type is required" })
  @IsString({ message: "Type must be a string" })
  @IsEnum(OrganizationTypeEnum, {
    message: "Type must be a valid organization type",
  })
  type: OrganizationTypeEnum;

  @ApiProperty({ type: "string" })
  @IsString()
  description: string;

  @ApiProperty({ type: "array", items: { type: "string" } })
  @IsArray()
  address: string[];

  @ApiProperty({ type: "string" })
  @IsString()
  logoUrl: string;

  @ApiProperty({ type: "string" })
  @IsString()
  about: string;

  @ApiProperty({ type: "string" })
  @IsString()
  websiteUrl: string;

  @ApiProperty({ type: "string" })
  @IsNotEmpty({ message: "Email is required" })
  @IsEmail()
  @MaxLength(255, { message: "Email must not exceed 255 characters" })
  @MinLength(2, { message: "Email must be at least 2 characters long" })
  email: string;

  @ApiProperty({ type: "string" })
  @IsNotEmpty({ message: "Phone is required" })
  @IsString()
  @MaxLength(20, { message: "Phone must not exceed 20 characters" })
  @MinLength(10, { message: "Phone must be at least 10 characters long" })
  phone: string;

  @ApiProperty({ type: "number" })
  @IsNotEmpty({ message: "Founded year is required" })
  @IsNumber()
  foundedYear: number;

  @ApiProperty({ type: "string" })
  @IsString()
  organizationCulture: string;

  @ApiProperty({ type: "number" })
  @IsNumber()
  employeesMin: number;

  @ApiProperty({ type: "number" })
  @IsNumber()
  employeesMax: number;

  @ApiProperty({ enum: UserStatusEnum })
  @IsEnum(UserStatusEnum)
  status: UserStatusEnum;

  @ApiProperty({ type: "string" })
  @IsString()
  verifiedAt: string;
}

export class UpdateOrganizationDto {
  @ApiProperty({ type: "string" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ type: "string" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: "array", items: { type: "string" } })
  @IsOptional()
  @IsArray()
  address?: string[];

  @ApiProperty({ type: "string" })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiProperty({ type: "string" })
  @IsOptional()
  @IsString()
  about?: string;

  @ApiProperty({ type: "string" })
  @IsOptional()
  @IsString()
  websiteUrl?: string;

  @ApiProperty({ type: "string" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ type: "string" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ type: "number" })
  @IsOptional()
  @IsNumber()
  foundedYear?: number;

  @ApiProperty({ type: "string" })
  @IsOptional()
  @IsString()
  organizationCulture?: string;

  @ApiProperty({ type: "number" })
  @IsOptional()
  @IsNumber()
  employeesMin?: number;

  @ApiProperty({ type: "number" })
  @IsOptional()
  @IsNumber()
  employeesMax?: number;
}
