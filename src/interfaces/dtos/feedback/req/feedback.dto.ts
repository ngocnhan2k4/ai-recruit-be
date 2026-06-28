import { ApiProperty } from "@nestjs/swagger";
import { GeneralQueryDto } from "../../common/query";
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsDate,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from "class-validator";
import {
  FeedbackStatusEnum,
  FeedbackTypeEnum,
} from "@/core/entities/enum.entity";
import { Transform, Type } from "class-transformer";

export class CreateFeedbackRequestDto {
  @ApiProperty({ description: "Name of the user submitting feedback" })
  @IsString()
  name: string;

  @ApiProperty({
    description: "Email to receive notification when resolved",
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: "Subject of the feedback" })
  @IsString()
  subject: string;

  @ApiProperty({ description: "Message content" })
  @IsString()
  message: string;

  @ApiProperty({
    description: "Array of image URLs",
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({
    description:
      "Free-form JSON payload. For UX surveys, MUST include `surveyKey` (string) to enable server-side dedupe.",
    required: false,
    type: Object,
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiProperty({
    required: false,
    enum: FeedbackTypeEnum,
    description:
      "Record type (`feedback` or `survey`). Defaults to `feedback`.",
  })
  @IsOptional()
  @IsEnum(FeedbackTypeEnum)
  type?: FeedbackTypeEnum;
}

export class GetSubmittedSurveysQueryDto {
  @ApiProperty({
    required: false,
    description:
      "Optional list of surveyKeys to filter on. If omitted, returns all surveyKeys this user has submitted.",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (typeof value === "string" ? [value] : value))
  surveyKeys?: string[];
}

export class GetFeedbacksRequestDto extends GeneralQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(FeedbackStatusEnum)
  status?: FeedbackStatusEnum;

  @ApiProperty({
    required: false,
    description: "Filter by assigned handler user id",
  })
  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiProperty({
    required: false,
    enum: FeedbackTypeEnum,
    description: "Filter records by type: `feedback` or `survey`.",
  })
  @IsOptional()
  @IsEnum(FeedbackTypeEnum)
  type?: FeedbackTypeEnum;
}

export class UpdateFeedbackRequestDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(FeedbackStatusEnum)
  status?: FeedbackStatusEnum;

  @ApiProperty({
    required: false,
    nullable: true,
    description:
      "User id of the staff member handling this feedback; null to unassign",
  })
  @IsOptional()
  @ValidateIf(
    (o: UpdateFeedbackRequestDto) =>
      o.assignedToUserId !== null && o.assignedToUserId !== undefined,
  )
  @IsUUID()
  assignedToUserId?: string | null;
}
