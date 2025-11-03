import { ApiProperty } from "@nestjs/swagger";
import { ApplyStatusEnum, JobStatusEnum, WorkTypeEnum } from "@/core";
import { PaginationResponseDto } from "../common/query";
import { CompanyDto } from "../companies/company.dto";
import { Skill } from "@/core";
import { SkillDto } from "../skills/skill.dto";
import { ProvinceDto } from "../provinces/province.dto";
import { Province } from "@/core";
import { IsBoolean, IsEnum, IsString } from "class-validator";
import { UpdateJobDto } from "./job-query.dto";
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
  organizationId: string;

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
  jobRawId: number | null;

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

  @ApiProperty({
    type: "string",
    required: false,
    nullable: true,
    description: "Reason for job rejection",
  })
  rejectReason: string | null;
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

export class JobResponseDto {
  @ApiProperty({ type: JobDto })
  job: JobDto;

  @ApiProperty({ type: [ProvinceDto] })
  provinces: Province[];

  @ApiProperty({ type: CompanyDto })
  company: CompanyDto;

  @ApiProperty({ type: [SkillDto] })
  skills: Skill[];
  @ApiProperty({
    example: false,
    required: false,
    description:
      "Whether the job is saved by the current user (only present for authenticated users)",
  })
  isSaved?: boolean;

  @ApiProperty({
    example: true,
    required: false,
    description:
      "Whether the current user has applied for this job (only present for authenticated users)",
  })
  @IsBoolean()
  isApplied?: boolean;

  @ApiProperty({
    example: "applied",
    required: false,
    description:
      "Application status if user has applied for this job (only present for authenticated users)",
  })
  applyStatus?: string;

  @ApiProperty({
    example: "uuid-apply-id",
    required: false,
    description:
      "Application ID if user has applied for this job (only present for authenticated users)",
  })
  applyId?: string;
}

export class SavedJobsResponseDto {
  @ApiProperty({
    example: "uuid-of-job",
    description: "Unique identifier for the job",
    required: true,
  })
  id: string;
  @ApiProperty({
    example: "Senior Software Engineer",
    description: "Title of the job",
    required: true,
  })
  title: string;
  @ApiProperty({
    example: "25000000",
    description: "Salary minimum for the job",
    required: false,
  })
  salaryMin: string | null;
  @ApiProperty({
    example: "40000000",
    description: "Salary maximum for the job",
    required: false,
  })
  salaryMax: string | null;
  @ApiProperty({
    example: "Tech Corp",
    description: "Name of the company offering the job",
    required: true,
  })
  companyName: string;
  @ApiProperty({
    example: "https://example.com/logo.png",
    description: "URL of the company's logo",
    required: false,
  })
  logoUrl?: string;
  @ApiProperty({
    example: "remote",
    description: "Work type (remote, onsite)",
    required: false,
  })
  workType: WorkTypeEnum;
  @ApiProperty({
    example: "2023-01-01T00:00:00Z",
    description: "Creation date of the job",
    required: true,
  })
  createdAt: string;
  @ApiProperty({
    example: "2023-12-31",
    description: "End date of the job",
    required: false,
  })
  endedAt?: string;
  @ApiProperty({
    example: "Hanoi",
    description: "Name of the province where the job is located",
    required: true,
  })
  provinceName: string;
  @ApiProperty({
    example: true,
    description: "Indicates if the job is saved by the user",
    required: true,
  })
  isSaved: boolean;

  @ApiProperty({
    example: false,
    description: "Indicates if the user has applied for the job",
    required: true,
  })
  isApplied: boolean;
}

export class AppliedJobsResponseDto extends SavedJobsResponseDto {
  @ApiProperty({
    example: "pending",
    description: "Application status for the job",
    required: true,
  })
  @IsEnum(ApplyStatusEnum)
  applyStatus: ApplyStatusEnum;
}

export class JobPaginationResponseDto {
  @ApiProperty({
    type: [JobResponseDto],
    description: "Array of job responses",
  })
  data: JobResponseDto[];

  @ApiProperty({
    type: PaginationResponseDto,
  })
  pagination: PaginationResponseDto;
}

export class UpdateJobStatusRequestDto extends UpdateJobDto {
  @ApiProperty({
    type: "string",
    description: "Organization Id",
  })
  @IsString()
  orgId: string;
}

export class UpdateJobStatusResponseDto {
  @ApiProperty({
    type: JobDto,
    description: "Updated job data",
  })
  job: JobDto;

  @ApiProperty({
    type: "boolean",
    description:
      "Whether notifications were sent successfully to organization members",
    example: true,
  })
  notificationSent: boolean;

  @ApiProperty({
    type: "number",
    description: "Number of organization members notified",
    example: 3,
  })
  notificationCount: number;
}
