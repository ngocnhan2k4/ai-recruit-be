import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsDateString } from "class-validator";

export class FeedbackTrendsQueryDto {
  @ApiProperty({
    required: false,
    description: "Start date for filtering (ISO date string)",
    example: "2024-01-01",
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiProperty({
    required: false,
    description: "End date for filtering (ISO date string)",
    example: "2024-12-31",
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}
