import {
  IsArray,
  IsEmail,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  OrganizationRoleEnum,
  OrganizationTypeEnum,
  SchoolTypeEnum,
} from "@/core";
import { CreateLocationDto } from "./organization-location.dto";
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
  @IsOptional()
  @IsString()
  logoUrl?: string;

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
  description?: string;

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
  @IsString()
  phone?: string;

  @ApiProperty({ type: "number" })
  @IsOptional()
  @IsNumber()
  employeesMin?: number;

  @ApiProperty({ type: "number" })
  @IsOptional()
  @IsNumber()
  employeesMax?: number;

  @ApiProperty({ type: () => Object, isArray: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  locations?: {
    id?: string;
    address: string;
    provinceId: string;
  }[];

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

export class CreateOrganizationInvitationDto {
  @ApiProperty({ type: "string", format: "uuid" })
  @IsNotEmpty({ message: "Invitee ID is required" })
  @IsUUID("4", { message: "Invitee ID must be a valid UUID" })
  inviteeId: string;

  @ApiProperty({ enum: OrganizationRoleEnum })
  @IsNotEmpty({ message: "Role is required" })
  @IsEnum(OrganizationRoleEnum, {
    message: "Role must be a valid organization role",
  })
  role: OrganizationRoleEnum;
}

export class RespondToInvitationDto {
  @ApiProperty({ enum: ["ACCEPT", "DECLINE"] })
  @IsNotEmpty({ message: "Action field is required" })
  action: "ACCEPT" | "DECLINE";
}

export class UpdateOrganizationEmailDto {
  @ApiProperty({
    type: "string",
    example: "newemail@company.com",
    description: "New email address for the organization",
  })
  @IsNotEmpty({ message: "Email is required" })
  @IsEmail({}, { message: "Invalid email format" })
  email: string;
}

export class SendEmailVerificationDto {
  @ApiProperty({
    type: "string",
    example: "organization@company.com",
    description: "Email address to send verification OTP",
  })
  @IsNotEmpty({ message: "Email is required" })
  @IsEmail({}, { message: "Invalid email format" })
  email: string;
}

export class VerifyOrganizationEmailDto {
  @ApiProperty({
    type: "string",
    example: "123456",
    description: "6-digit OTP code sent to email",
    minLength: 6,
    maxLength: 6,
  })
  @IsNotEmpty({ message: "OTP code is required" })
  @IsString()
  @MinLength(6, { message: "OTP must be 6 digits" })
  @MaxLength(6, { message: "OTP must be 6 digits" })
  @Matches(/^\d{6}$/, { message: "OTP must be 6 digits" })
  otpCode: string;

  @ApiProperty({
    type: "string",
    example: "organization@company.com",
    description: "Email address being verified",
  })
  @IsNotEmpty({ message: "Email is required" })
  @IsEmail({}, { message: "Invalid email format" })
  email: string;
}

export class ConfirmUpdateOrganizationEmailDto {
  @ApiProperty({
    type: "string",
    example: "123456",
    description: "6-digit OTP code sent to the NEW email address",
    minLength: 6,
    maxLength: 6,
  })
  @IsNotEmpty({ message: "OTP code is required" })
  @IsString()
  @MinLength(6, { message: "OTP must be 6 digits" })
  @MaxLength(6, { message: "OTP must be 6 digits" })
  @Matches(/^\d{6}$/, { message: "OTP must be 6 digits" })
  otpCode: string;

  @ApiProperty({
    type: "string",
    example: "newemail@company.com",
    description: "The NEW email address to be confirmed",
  })
  @IsNotEmpty({ message: "Email is required" })
  @IsEmail({}, { message: "Invalid email format" })
  email: string;
}

export class DeleteOrganizationDto {
  @ApiProperty({
    type: "string",
    example: "My Company Name",
    description:
      "Organization name for confirmation. Must match exactly to proceed with deletion.",
  })
  @IsNotEmpty({ message: "Organization name confirmation is required" })
  @IsString()
  confirmationName: string;
}

export class UpdateOrganizationBasicInfoDto {
  @ApiProperty({
    type: "string",
    example: "Tech Solutions Inc.",
    description: "Organization name",
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    type: "string",
    example: "Leading technology solutions provider",
    description: "Short description of the organization",
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    type: "string",
    example: "https://techsolutions.com",
    description: "Organization website URL",
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsUrl({}, { message: "Invalid URL format" })
  websiteUrl?: string;

  @ApiProperty({
    type: "string",
    example: "0123456789",
    description: "Organization phone number (10-11 digits)",
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^0\d{9,10}$/, {
    message: "Phone must be 10-11 digits and start with 0",
  })
  phone?: string;
}

export class UpdateOrganizationLocationDto {
  @ApiProperty({
    type: () => CreateLocationDto,
    isArray: true,
    description: "List of organization locations",
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLocationDto)
  locations: CreateLocationDto[];
}

export class UpdateOrganizationAdditionalInfoDto {
  @ApiProperty({
    type: "string",
    example:
      "Văn hóa làm việc năng động, sáng tạo, coi trọng sự đổi mới và phát triển bền vững.",
    description: "Company culture description (max 500 characters)",
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: "Culture must not exceed 500 characters" })
  culture?: string;

  @ApiProperty({
    type: "string",
    example:
      "Lương thưởng cạnh tranh, bảo hiểm đầy đủ, du lịch hàng năm, đào tạo nâng cao kỹ năng.",
    description: "Employee benefits (max 500 characters)",
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: "Benefits must not exceed 500 characters" })
  benefits?: string;
}

export class AdminUpdateOrganizationUpsertDTO {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsUrl({}, { message: "Invalid URL format" })
  websiteUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    required: false,
    description:
      "Set verifiedAt (ISO 8601 date string) to verify organization, null to unverify",
  })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsISO8601({}, { message: "verifiedAt must be a valid ISO 8601 date string" })
  @IsOptional()
  verifiedAt?: string | null;
}
