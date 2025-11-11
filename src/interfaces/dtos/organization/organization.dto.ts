import { ApiProperty } from "@nestjs/swagger";
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import {
  OrganizationLocation,
  OrganizationRoleEnum,
  OrganizationTypeEnum,
  SchoolTypeEnum,
} from "@/core";
import { IsEmail } from "class-validator";
import { Type } from "class-transformer";

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
  description: string | null;

  @ApiProperty({ type: "array", items: { type: "string" } })
  address: string[] | null;

  @ApiProperty({ type: "string" })
  logoUrl: string | null;

  @ApiProperty({ type: "string" })
  about: string | null;

  @ApiProperty({ type: "string" })
  websiteUrl: string | null;

  @ApiProperty({ type: "string" })
  email: string | null;

  @ApiProperty({ type: "string" })
  phone: string | null;

  @ApiProperty({ type: "number" })
  foundedYear: number | null;

  @ApiProperty({ type: "number" })
  employeesMin: number | null;

  @ApiProperty({ type: "number" })
  employeesMax: number | null;

  @ApiProperty({ type: "string", format: "date-time" })
  createdAt: Date;

  @ApiProperty({ type: "string", format: "date-time" })
  updatedAt: Date | null;

  @ApiProperty({ type: "string", format: "date-time" })
  deletedAt: Date | null;

  @ApiProperty({ type: "string" })
  verifiedAt: Date | null;
}

export class CreateOrganizationDto {
  @ApiProperty({ type: "string" })
  @IsNotEmpty({ message: "Name is required" })
  @IsString({ message: "Name must be a string" })
  @MaxLength(255, { message: "Name must not exceed 255 characters" })
  @MinLength(2, { message: "Name must be at least 2 characters long" })
  name: string;

  @ApiProperty({ enum: OrganizationTypeEnum })
  @IsNotEmpty({ message: "Type is required" })
  @IsEnum(OrganizationTypeEnum, {
    message: "Type must be a valid organization type",
  })
  type: OrganizationTypeEnum;

  @ApiProperty({ type: "string" })
  @IsNotEmpty({ message: "Description is required" })
  @IsString()
  description: string;

  @ApiProperty({ type: "string" })
  @IsNotEmpty({ message: "Logo is required" })
  @IsString()
  logoUrl: string;

  @ApiProperty({ type: "string" })
  @IsOptional()
  @IsString()
  about?: string;

  @ApiProperty({ type: "string" })
  @IsNotEmpty({ message: "Website URL is required" })
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

  @ApiProperty({ type: "number" })
  @IsNotEmpty({ message: "Employees min is required" })
  @IsNumber()
  employeesMin: number;

  @ApiProperty({ type: "number" })
  @IsNotEmpty({ message: "Employees max is required" })
  @IsNumber()
  employeesMax: number;

  @ApiProperty({ type: () => CreateLocationDto, isArray: true })
  @IsNotEmpty({ message: "Locations is required" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLocationDto)
  locations: CreateLocationDto[];

  @ApiProperty({ type: "string" })
  @IsOptional()
  @IsString()
  taxCode: string;

  @ApiProperty({ type: "string" })
  @IsOptional()
  @IsString()
  culture: string;

  @ApiProperty({ type: "string" })
  @IsOptional()
  @IsString()
  benefit: string;

  @ApiProperty({ enum: SchoolTypeEnum })
  @IsOptional()
  @IsEnum(SchoolTypeEnum, {
    message: "School type must be a valid school type",
  })
  schoolType: SchoolTypeEnum;
}

export class UpdateOrganizationDto {
  @ApiProperty({ type: "string" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ type: "string" })
  @IsOptional()
  @IsString()
  slug?: string;

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

  @ApiProperty({ type: "number" })
  @IsOptional()
  @IsNumber()
  employeesMin?: number;

  @ApiProperty({ type: "number" })
  @IsOptional()
  @IsNumber()
  employeesMax?: number;

  // Flat company and school fields
  @ApiProperty({ type: "string" })
  @IsOptional()
  @IsString()
  taxCode?: string;

  @ApiProperty({ type: "string" })
  @IsOptional()
  @IsString()
  culture?: string;

  @ApiProperty({ type: "string" })
  @IsOptional()
  @IsString()
  benefit?: string;

  @ApiProperty({ enum: SchoolTypeEnum })
  @IsOptional()
  @IsEnum(SchoolTypeEnum)
  schoolType?: SchoolTypeEnum;
}

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

export class CreateLocationDto {
  @ApiProperty({ type: "string" })
  @IsNotEmpty({ message: "Address is required" })
  @IsString()
  address: string;

  @ApiProperty({ type: "string" })
  @IsNotEmpty({ message: "Province ID is required" })
  @IsUUID()
  provinceId: string;
}

export class OrganizationWithDetailsDto extends OrganizationDto {
  companySize?: number | null;
  taxCode?: string | null;
  benefits?: string | null;
  culture?: string | null;
  schoolType?: SchoolTypeEnum | null;
  locations?: OrganizationLocation[] | null;
  role: OrganizationRoleEnum = OrganizationRoleEnum.ANONYMOUSLY;
}
