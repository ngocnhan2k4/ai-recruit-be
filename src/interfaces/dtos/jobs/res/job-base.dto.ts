import { ApiProperty } from "@nestjs/swagger";
import { JobStatusEnum, WorkTypeEnum } from "@/core";

export class JobDto {
  @ApiProperty({ type: "string", format: "uuid" })
  id: string;

  @ApiProperty({ type: "string" })
  title: string;

  @ApiProperty({
    type: "string",
    nullable: true,
    description: "Job description in plain text format",
  })
  description: string | null;

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

  @ApiProperty({
    type: "number",
    nullable: true,
    required: false,
    description: "Number of candidates requested for recommendation",
    example: 10,
  })
  recruitCount?: number | null;

  @ApiProperty({ type: "number", nullable: true })
  experienceMin: number | null;

  @ApiProperty({ type: "number", nullable: true })
  experienceMax: number | null;

  @ApiProperty({ type: "string", nullable: true })
  datePosted: string | null;

  @ApiProperty({ type: "string", nullable: true })
  endDate: string | null;

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
