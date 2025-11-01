import { ApiProperty } from "@nestjs/swagger";
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import {
  OrganizationTypeEnum,
  UserStatusEnum,
  OrganizationRoleEnum,
} from "@/core";
import { IsEmail } from "class-validator";
import { GeneralQueryDto } from "../common/query";

export class OrganizationDto {
  @ApiProperty({ type: "string", format: "uuid" })
  id: string;

  @ApiProperty({ type: "string" })
  name: string;

  @ApiProperty({ type: "string" })
  slug: string;

  @ApiProperty({ type: "string" })
  type: string;

  @ApiProperty({ type: "string" })
  description: string;

  @ApiProperty({ type: "array", items: { type: "string" } })
  address: string[];

  @ApiProperty({ type: "string" })
  logoUrl: string;

  @ApiProperty({ type: "string" })
  about: string;

  @ApiProperty({ type: "string" })
  websiteUrl: string;

  @ApiProperty({ type: "string" })
  email: string;

  @ApiProperty({ type: "string" })
  phone: string;

  @ApiProperty({ type: "number" })
  foundedYear: number;

  @ApiProperty({ type: "number" })
  employeesMin: number;

  @ApiProperty({ type: "number" })
  employeesMax: number;

  @ApiProperty({ type: "string", format: "date-time" })
  createdAt: Date;

  @ApiProperty({ type: "string", format: "date-time" })
  updatedAt: Date;

  @ApiProperty({ type: "string", format: "date-time" })
  deletedAt: Date;

  @ApiProperty({ type: "string" })
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

export class CheckOrganizationNameResponseDto {
  @ApiProperty()
  exists: boolean;
}

export class OrganizationMemberDto {
  @ApiProperty({ type: "string", format: "uuid" })
  id: string;

  @ApiProperty({ type: "string", format: "uuid" })
  userId: string;

  @ApiProperty({ type: "string", format: "uuid" })
  organizationId: string;

  @ApiProperty({ type: "string" })
  role: string;

  @ApiProperty({ type: "string", format: "date-time" })
  createdAt: Date;

  @ApiProperty({ type: "string", format: "date-time", nullable: true })
  updatedAt: Date | null;

  @ApiProperty({ type: "string", format: "date-time", nullable: true })
  deletedAt: Date | null;

  @ApiProperty({ required: false })
  user?: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
  };
}

export class GetOrganizationMembersQueryDto extends GeneralQueryDto {
  @ApiProperty({ enum: OrganizationRoleEnum, required: false })
  @IsOptional()
  @IsEnum(OrganizationRoleEnum)
  role?: OrganizationRoleEnum;
}
