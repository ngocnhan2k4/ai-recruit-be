import { ApiProperty } from "@nestjs/swagger";

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
}
