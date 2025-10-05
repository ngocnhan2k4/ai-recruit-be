import { ApiProperty } from "@nestjs/swagger";

enum WorkType {
  REMOTE = "remote",
  ONSITE = "onsite",
}
enum ApplyType {
  ONSITE = "onsite",
  GOTO_URL = "goto_url",
}
enum Status {
  ACTIVE = "active",
  INACTIVE = "inactive",
}
export class JobDto {
  @ApiProperty({ type: "string", format: "uuid" })
  id: string;

  @ApiProperty({ type: "string" })
  title: string;

  @ApiProperty({
    type: "string",
    nullable: true,
    description: "Job description in JSON format",
  })
  description: unknown;

  @ApiProperty({ type: "string" })
  companyId: string;

  @ApiProperty({ type: "string", nullable: true })
  salaryMin: string | null;

  @ApiProperty({ type: "string", nullable: true })
  salaryMax: string | null;

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
    enum: WorkType,
  })
  workType?: string | null;

  @ApiProperty({
    type: "number",
    nullable: true,
    description: "Years of experience required",
    example: 3,
  })
  experienceYear?: number | null;

  @ApiProperty({
    type: "string",
    description: "Application type",
    example: "onsite",
    enum: ApplyType,
  })
  applyType: string;

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
    enum: Status,
  })
  status?: string | null;
}
