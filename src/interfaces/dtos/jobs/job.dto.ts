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
  company_id: string;

  @ApiProperty({ type: "number", nullable: true })
  salary_min: number | null;

  @ApiProperty({ type: "number", nullable: true })
  salary_max: number | null;

  @ApiProperty({ type: "string", format: "date-time" })
  created_at: Date;

  @ApiProperty({ type: "string", format: "date-time", nullable: true })
  updated_at: Date | null;

  @ApiProperty({ type: "string", format: "date-time", nullable: true })
  deleted_at: Date | null;
}
