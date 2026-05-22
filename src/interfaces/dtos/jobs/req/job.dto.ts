import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsUUID,
  IsArray,
  IsEnum,
} from "class-validator";
import { JobStatusEnum, WorkTypeEnum } from "@/core";
import { Transform, Type } from "class-transformer";
import { GeneralQueryDto } from "../../common/query";

export class QueryJobDto extends GeneralQueryDto {
  @ApiProperty({
    example: 15000000,
    required: false,
    description: "Minimum salary",
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  salaryMin?: number;

  @ApiProperty({
    example: 20000000,
    required: false,
    description: "Maximum salary",
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  salaryMax?: number;

  @ApiProperty({
    example: 1,
    required: false,
    description: "Minimum years of experience",
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  experienceMin?: number;

  @ApiProperty({
    example: 5,
    required: false,
    description: "Maximum years of experience",
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  experienceMax?: number;

  @ApiProperty({
    example: "uuid-province-id",
    required: false,
    description: "Province ID to filter by",
  })
  @IsOptional()
  @IsString()
  provinceId?: string;

  @ApiProperty({
    example: "uuid-company-id",
    required: false,
    description: "Company ID to filter by",
  })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiProperty({
    example: "uuid-category-id",
    required: false,
    description: "Category ID to filter by",
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({
    required: false,
    description: "Organization ID to filter by",
  })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({
    example: "remote",
    required: false,
    description: "Work type (remote, onsite)",
  })
  @IsOptional()
  @IsEnum(WorkTypeEnum)
  workType?: WorkTypeEnum;

  @ApiProperty({
    example: "active",
    required: false,
    description: "Status (active, inactive)",
  })
  @IsOptional()
  @IsEnum(JobStatusEnum)
  status?: JobStatusEnum;

  @ApiProperty({
    example: "2024-01-01",
    required: false,
    description: "Filter jobs created on or after this date (ISO string)",
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiProperty({
    example: "2024-12-31",
    required: false,
    description: "Filter jobs created on or before this date (ISO string)",
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiProperty({
    type: [String],
    required: false,
    description: "Array of skill IDs",
  })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsUUID("4", { each: true })
  skillIds?: string[];
}

export class CreateJobDto {
  @ApiProperty({ type: "string" })
  @IsString()
  title: string;

  @ApiProperty({
    type: "string",
    nullable: true,
    description: "Job description in plain text format",
  })
  @IsOptional()
  description: string | null;

  @ApiProperty({ type: "string", format: "uuid" })
  @IsUUID()
  organizationId: string;

  @ApiProperty({ type: "string", nullable: true })
  @IsOptional()
  @IsString()
  salaryMin?: string | null;

  @ApiProperty({ type: "string", nullable: true })
  @IsOptional()
  @IsString()
  salaryMax?: string | null;

  @ApiProperty({
    type: "number",
    required: false,
    nullable: true,
    description: "Number of candidates requested for recommendation",
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  recruitCount?: number | null;

  @ApiProperty({ type: "number", nullable: true })
  @IsOptional()
  @IsNumber()
  experienceMin?: number | null;

  @ApiProperty({ type: "number", nullable: true })
  @IsOptional()
  @IsNumber()
  experienceMax?: number | null;

  @ApiProperty({
    type: "string",
    format: "date",
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @ApiProperty({
    type: "string",
    nullable: true,
    description: "Work type",
    example: "remote",
    enum: Object.values(WorkTypeEnum),
  })
  @IsOptional()
  @IsEnum(WorkTypeEnum)
  workType: WorkTypeEnum;

  @ApiProperty({
    type: [String],
    required: false,
    description: "Danh sách province ids",
    nullable: true,
  })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  provinceIds?: string[] | null;

  @ApiProperty({
    type: [String],
    nullable: true,
    description: "Array of questions for the job",
    example: [
      "What is your experience with React?",
      "How do you handle state management?",
    ],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  questions: string[] | null;

  @ApiProperty({
    type: [String],
    nullable: true,
    description: "Array of skill IDs associated with the job",
    example: [
      "550e8400-e29b-41d4-a716-446655440000",
      "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    ],
  })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  skillIds: string[] | null;

  @ApiProperty({
    type: [String],
    required: false,
    description:
      "Array of new skill names to create and associate with the job",
    nullable: true,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skillNames?: string[] | null;

  @ApiProperty({ type: "string", format: "uuid", nullable: true })
  @IsUUID()
  categoryId: string | null;

  @ApiProperty({
    type: "string",
    nullable: true,
    required: false,
    description: "Application URL for external applications",
    example: "https://company.com/apply/job-123",
  })
  @IsOptional()
  @IsString()
  applyUrl?: string | null;
}

export class UpdateJobDto {
  @ApiProperty({ type: "string", required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    type: "string",
    nullable: true,
    description: "Job description in plain text format",
  })
  @IsOptional()
  description: string | null;

  @ApiProperty({ type: "string", format: "uuid", required: false })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiProperty({
    type: "string",
    format: "uuid",
    nullable: true,
    required: false,
    description: "Category ID to associate with the job",
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @ApiProperty({ type: "string", nullable: true, required: false })
  @IsOptional()
  @IsString()
  salaryMin?: string | null;

  @ApiProperty({ type: "string", nullable: true, required: false })
  @IsOptional()
  @IsString()
  salaryMax?: string | null;

  @ApiProperty({
    type: "number",
    required: false,
    nullable: true,
    description: "Number of candidates requested for recommendation",
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  recruitCount?: number | null;

  @ApiProperty({ type: "number", nullable: true, required: false })
  @IsOptional()
  @IsNumber()
  experienceMin?: number | null;

  @ApiProperty({ type: "number", nullable: true, required: false })
  @IsOptional()
  @IsNumber()
  experienceMax?: number | null;

  @ApiProperty({
    type: "string",
    format: "date",
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  datePosted?: string | null;

  @ApiProperty({
    type: "string",
    format: "date",
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @ApiProperty({
    type: "string",
    nullable: true,
    description: "Work type",
    example: "remote",
    enum: Object.values(WorkTypeEnum),
  })
  @IsOptional()
  @IsEnum(WorkTypeEnum)
  workType: WorkTypeEnum;

  @ApiProperty({
    type: "string",
    nullable: true,
    description: "Application URL for external applications",
    example: "https://company.com/apply/job-123",
  })
  @IsOptional()
  @IsString()
  applyUrl: string | null;

  @ApiProperty({
    type: "string",
    nullable: true,
    description: "Status (active, inactive)",
    example: "active",
    enum: Object.values(JobStatusEnum),
  })
  @IsOptional()
  @IsEnum(JobStatusEnum)
  status: JobStatusEnum;

  @ApiProperty({
    type: "number",
    nullable: true,
    description: "Priority level",
  })
  @IsOptional()
  @IsNumber()
  priority?: number | null;

  @ApiProperty({
    type: [String],
    required: false,
    description: "Danh sách province ids",
    nullable: true,
  })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  provinceIds?: string[] | null;

  @ApiProperty({
    type: [String],
    nullable: true,
    description: "Array of questions for the job",
    example: [
      "What is your experience with React?",
      "How do you handle state management?",
    ],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  questions: string[] | null;

  @ApiProperty({
    type: [String],
    nullable: true,
    description: "Array of skill IDs associated with the job",
    example: [
      "550e8400-e29b-41d4-a716-446655440000",
      "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    ],
  })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  skillIds?: string[] | null;

  @ApiProperty({
    type: [String],
    required: false,
    description:
      "Array of new skill names to create and associate with the job",
    nullable: true,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skillNames?: string[] | null;

  @ApiProperty({
    type: "string",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  rejectReason?: string | null;
}
