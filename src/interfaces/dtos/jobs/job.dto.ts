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

export class CreateJobDto {
  @ApiProperty({ type: "string" })
  @IsString()
  title: string;

  @ApiProperty({
    type: "object",
    nullable: true,
    description: "Job description in JSON format",
    additionalProperties: {},
  })
  @IsOptional()
  description?: unknown;

  @ApiProperty({ type: "string", format: "uuid" })
  @IsUUID()
  companyId: string;

  @ApiProperty({ type: "string", nullable: true })
  @IsOptional()
  @IsString()
  salaryMin?: string | null;

  @ApiProperty({ type: "string", nullable: true })
  @IsOptional()
  @IsString()
  salaryMax?: string | null;

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
    type: "string",
    nullable: true,
    description: "Status (active, inactive)",
    example: "active",
    enum: Object.values(JobStatusEnum),
  })
  @IsOptional()
  @IsEnum(JobStatusEnum)
  status: JobStatusEnum;

  @ApiProperty({ type: "string", format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  provinceId?: string | null;

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
}

export class UpdateJobDto {
  @ApiProperty({ type: "string", required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    type: "object",
    nullable: true,
    description: "Job description in JSON format",
    additionalProperties: {},
  })
  @IsOptional()
  description?: unknown;

  @ApiProperty({ type: "string", format: "uuid", required: false })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiProperty({ type: "string", nullable: true, required: false })
  @IsOptional()
  @IsString()
  salaryMin?: string | null;

  @ApiProperty({ type: "string", nullable: true, required: false })
  @IsOptional()
  @IsString()
  salaryMax?: string | null;

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
    type: "string",
    format: "uuid",
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  provinceId?: string | null;

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
    type: "string",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  rejectReason?: string | null;
}

export class JobDto {
  @ApiProperty({ type: "string", format: "uuid" })
  id: string;

  @ApiProperty({ type: "string" })
  title: string;

  @ApiProperty({
    type: "object",
    nullable: true,
    description: "Job description in JSON format",
    additionalProperties: {},
  })
  description: unknown;

  @ApiProperty({
    type: [String],
    nullable: true,
  })
  questions: string[] | null;

  @ApiProperty({ type: "string" })
  companyId: string;

  @ApiProperty({ type: "string", nullable: true })
  salaryMin: string | null;

  @ApiProperty({ type: "string", nullable: true })
  salaryMax: string | null;

  @ApiProperty({ type: "number", nullable: true })
  experienceMin: number | null;

  @ApiProperty({ type: "number", nullable: true })
  experienceMax: number | null;

  @ApiProperty({ type: "string", nullable: true })
  datePosted: string | null;

  @ApiProperty({ type: "string", nullable: true })
  endDate: string | null;

  @ApiProperty({ type: "string", format: "uuid", nullable: true })
  provinceId: string | null;

  @ApiProperty({ type: "string", format: "date-time" })
  createdAt: Date;

  @ApiProperty({ type: "string", format: "date-time", nullable: true })
  updatedAt: Date | null;

  @ApiProperty({ type: "string", format: "date-time", nullable: true })
  deletedAt: Date | null;

  @ApiProperty({
    type: "string",
    nullable: true,
    description: "Work type",
    example: "remote",
  })
  workType: WorkTypeEnum | null;

  @ApiProperty({
    type: "number",
    nullable: true,
    description: "Years of experience required",
    example: 3,
  })
  experienceYear?: number | null;

  @ApiProperty({
    type: "number",
    nullable: true,
    description: "Job Raw ID from jobRaws table",
  })
  jobRawId?: number | null;

  @ApiProperty({
    type: "string",
    nullable: true,
    description: "Application URL for external applications",
    example: "https://company.com/apply/job-123",
  })
  applyUrl?: string | null;

  @ApiProperty({
    type: "string",
    nullable: true,
    description: "Status (active, inactive)",
    example: "active",
  })
  status: JobStatusEnum;
}

export class JobStatusCountDto {
  @ApiProperty({})
  status: JobStatusEnum;

  @ApiProperty()
  count: number;
}

export class JobCountsDto {
  @ApiProperty({ example: 0 })
  total: number;

  @ApiProperty({ type: [JobStatusCountDto] })
  byStatus: JobStatusCountDto[];
}
