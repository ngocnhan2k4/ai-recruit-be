import { ApiProperty } from "@nestjs/swagger";
import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsEnum,
} from "class-validator";
import { Type } from "class-transformer";
import { GeneralQueryDto, PaginationResponseDto } from "../common/query";
import { CompanyDto } from "../companies/company.dto";
import { JobDto, JobStatus } from "./job.dto";
import { Skill } from "@/core";
import { SkillDto } from "../skills/skill.dto";
import { ProvinceDto } from "../provinces/province.dto";
import { Province } from "@/core";

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
    example: "remote",
    required: false,
    description: "Work type (remote, onsite)",
  })
  @IsOptional()
  @IsString()
  workType?: string;

  @ApiProperty({
    example: "active",
    required: false,
    description: "Status (active, inactive)",
  })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;
}

export class JobResponse {
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
  workType: "remote" | "onsite";
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

export class JobPaginationResponseDto {
  @ApiProperty({
    type: [JobResponse],
    description: "Array of job responses",
  })
  data: JobResponse[];

  @ApiProperty({
    type: PaginationResponseDto,
  })
  pagination: PaginationResponseDto;
}
