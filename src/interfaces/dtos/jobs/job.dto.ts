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
  description: Record<string, unknown> | null;

  @ApiProperty({ type: "string" })
  companyId: string;

  @ApiProperty({ type: "number", nullable: true })
  salaryMin: number | null;

  @ApiProperty({ type: "number", nullable: true })
  salaryMax: number | null;

  @ApiProperty({ type: "string", format: "date-time" })
  createdAt: Date;

  @ApiProperty({ type: "string", format: "date-time", nullable: true })
  updatedAt: Date | null;

  @ApiProperty({ type: "string", format: "date-time", nullable: true })
  deletedAt: Date | null;
}
