import { ApiProperty } from "@nestjs/swagger";
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from "class-validator";

export enum EventTypeEnum {
  VIEW_JOB = "view_job",
  SAVE_JOB = "save_job",
  UNSAVE_JOB = "unsave_job",
  APPLY_JOB = "apply_job",
  VIEW_COMPANY = "view_company",
  FILTER_JOB = "filter_job",
  SEARCH_JOB = "search_job",
  VIEW_JOB_RECOMMENDATION = "view_job_recommendation",
  CLICK_JOB_RECOMMENDATION = "click_job_recommendation",
  FILTER_STATISTICS = "filter_statistics",
}

export enum ObjectTypeEnum {
  BLOG = "BLOG",
  ORG = "ORG",
  JOB = "JOB",
  USER = "USER",
}

export class CreateTrackingEventRequestDto {
  @ApiProperty({ enum: EventTypeEnum })
  @IsEnum(EventTypeEnum)
  @IsNotEmpty()
  eventType: EventTypeEnum;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  objectId: string;

  @ApiProperty({ enum: ObjectTypeEnum })
  @IsEnum(ObjectTypeEnum)
  @IsNotEmpty()
  objectType: ObjectTypeEnum;

  @ApiProperty({ type: "object", additionalProperties: true })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiProperty()
  @IsString()
  @IsOptional()
  createdAt?: string;
}
