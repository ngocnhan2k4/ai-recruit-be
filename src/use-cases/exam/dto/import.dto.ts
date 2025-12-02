import { ApiProperty } from "@nestjs/swagger";

export class ImportResultDto {
  @ApiProperty({ example: 100 })
  totalRows: number;

  @ApiProperty({ example: 95 })
  successRows: number;

  @ApiProperty({ example: 5 })
  failedRows: number;

  @ApiProperty({
    example: ["Row 5: Invalid skill_id", "Row 12: Missing correct_answer"],
  })
  errors: string[];
}
