import { ApiProperty } from "@nestjs/swagger";
import { ApplyStatusEnum, WorkTypeEnum } from "@/core";
import { PaginationResponseDto } from "../../common/query";
import { SkillDto } from "@/interfaces/dtos/skills/res/skill.dto";
import { ProvinceDto } from "@/interfaces/dtos/provinces/res/province.dto";
import { IsBoolean } from "class-validator";
import { OrganizationWithDetailsDto } from "@/interfaces/dtos/organization/res/organization.dto";
import { JobDto as JobBaseDto } from "./job-base.dto";

export class JobStatusCountDto {
  @ApiProperty({})
  status: string;

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
  @ApiProperty({ type: JobBaseDto })
  job: JobBaseDto;

  @ApiProperty({ type: [ProvinceDto] })
  provinces: ProvinceDto[];

  @ApiProperty({ type: OrganizationWithDetailsDto })
  organization: OrganizationWithDetailsDto;

  @ApiProperty({ type: [SkillDto] })
  skills: SkillDto[];

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
    example: ["Hanoi", "Ho Chi Minh City"],
    description: "Name of the province where the job is located",
    required: true,
  })
  provinceNames: string[];
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
