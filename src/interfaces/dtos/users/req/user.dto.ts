import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsArray,
  IsNumber,
  IsUUID,
  ValidateIf,
  ArrayMinSize,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { GeneralQueryDto } from "../../common/query";
import {
  AdminEmailTemplateId,
  GenderEnum,
  UserSubscriptionStatusEnum,
} from "@/core";
import { RoleEnum } from "@/common/constants";
import { Transform, Type } from "class-transformer";
import { SUPPORTED_LANGUAGE_CODES } from "@/common/constants/translation";

export class CreateUserRequestDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  username: string;

  @ApiProperty()
  @IsString()
  bio: string;

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiProperty({ enum: GenderEnum })
  @IsEnum(GenderEnum)
  gender: GenderEnum;
}

export class UpdateUserRequestDto extends PartialType(CreateUserRequestDto) {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false, example: "2004-05-07" })
  @IsOptional()
  @IsDateString()
  dob?: string;

  @ApiProperty({ required: false, type: "boolean" })
  @IsOptional()
  @IsBoolean()
  onboardingCompleted?: boolean;

  @ApiProperty({
    required: false,
    description: "Total years of experience for matching",
    example: 5,
  })
  @IsOptional()
  @IsNumber()
  experienceYears?: number | null;

  @ApiProperty({
    required: false,
    type: [String],
    description: "Array of province IDs where user wants to work",
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  provinceIds?: string[];

  @ApiProperty({
    required: false,
    type: [String],
    description: "Array of category IDs user is interested in",
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  @ApiProperty({
    required: false,
    description: "Expected salary in VND",
    example: 15000000,
  })
  @IsOptional()
  @IsNumber()
  expectedSalary?: number | null;

  @ApiProperty({
    required: false,
    description: "Whether the user is actively seeking a job",
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isSeekingJob?: boolean;

  @ApiProperty({
    required: false,
    description: "Current career goal",
  })
  @IsOptional()
  @IsString()
  currentGoal?: string | null;

  @ApiProperty({
    required: false,
    type: [String],
    description: "Array of skill IDs",
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[] | null;

  @ApiProperty({
    required: false,
    enum: SUPPORTED_LANGUAGE_CODES,
    description: "Preferred language for notifications and realtime updates",
  })
  @IsOptional()
  @IsString()
  @IsIn(SUPPORTED_LANGUAGE_CODES)
  preferredLanguage?: string;
}

export class UpdatePreferredLanguageRequestDto {
  @ApiProperty({
    enum: SUPPORTED_LANGUAGE_CODES,
    description: "Preferred language for notifications and realtime updates",
    example: "en",
  })
  @IsString()
  @IsIn(SUPPORTED_LANGUAGE_CODES)
  preferredLanguage: string;
}

export enum TypeAvatar {
  AVATAR = "avatar",
  BANNER = "banner",
}

export class UserAvatarUpdateRequestDto {
  @ApiProperty({ enum: TypeAvatar })
  @IsEnum(TypeAvatar)
  type: TypeAvatar;
}

export class GetUserQueryDto extends GeneralQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isDeleted?: boolean;

  @ApiPropertyOptional({
    description: "Filter by subscription id",
    example: "550e8400-e29b-41d4-a716-446655440001",
  })
  @IsOptional()
  @IsUUID()
  subscriptionId?: string;

  @ApiPropertyOptional({
    enum: UserSubscriptionStatusEnum,
    description: "Filter by status",
  })
  @IsOptional()
  @IsEnum(UserSubscriptionStatusEnum)
  statusSubscription?: UserSubscriptionStatusEnum;

  @ApiPropertyOptional({
    description: "Filter by role",
    example: [RoleEnum.USER, RoleEnum.ADMIN],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(RoleEnum, { each: true })
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : undefined,
  )
  roles?: RoleEnum[];

  @ApiPropertyOptional({
    description: "Filter by fields",
    example: ["subscription", "userSubscription"],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : undefined,
  )
  fields?: string[];
}

export class AdminUpdateUserRequestDto {
  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsEnum(RoleEnum, { each: true })
  roles?: RoleEnum[];
}

export class AdminSendEmailRequestDto {
  @ApiProperty({ enum: AdminEmailTemplateId })
  @IsEnum(AdminEmailTemplateId)
  templateId: AdminEmailTemplateId;

  @ApiProperty({ description: "Email subject (editable)" })
  @IsString()
  subject: string;

  @ApiProperty({
    description:
      "Email body text; supports {{name}} and {{email}} placeholders",
  })
  @IsString()
  body: string;

  @ApiPropertyOptional({
    type: [String],
    description:
      "Explicit user IDs to email (required when selectAllMatching is false)",
  })
  @ValidateIf((o) => !o.selectAllMatching)
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID("4", { each: true })
  userIds?: string[];

  @ApiPropertyOptional({
    description:
      "When true, email all users matching keyword/subscriptionId/statusSubscription filters",
  })
  @IsOptional()
  @IsBoolean()
  selectAllMatching?: boolean;

  @ApiPropertyOptional({
    description: "Filter keyword (with selectAllMatching)",
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: "Filter by subscription id" })
  @IsOptional()
  @IsUUID()
  subscriptionId?: string;

  @ApiPropertyOptional({
    enum: UserSubscriptionStatusEnum,
    description: "Filter by subscription status",
  })
  @IsOptional()
  @IsEnum(UserSubscriptionStatusEnum)
  statusSubscription?: UserSubscriptionStatusEnum;
}
