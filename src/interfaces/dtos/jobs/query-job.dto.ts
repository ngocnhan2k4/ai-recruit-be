import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, IsNumber } from "class-validator";
import { Type } from "class-transformer";
import { GeneralQueryDto } from "../common/query";
import { CompanyDto } from "../companies/company.dto";
import { JobDto } from "./job.dto";
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
  @IsString()
  status?: string;
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

export class JobPaginationResponseDto {
  @ApiProperty({
    type: [JobResponse],
    description: "Array of job responses",
  })
  jobData: JobResponse[];

  @ApiProperty({
    required: false,
    description: "Cursor for next page pagination",
    example: "uuid-of-last-item",
  })
  nextCursor?: string;

  @ApiProperty({
    description: "Whether there are more pages available",
    example: true,
  })
  hasNextPage: boolean;
}
