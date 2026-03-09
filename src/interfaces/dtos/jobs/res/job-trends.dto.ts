import { ApiProperty } from "@nestjs/swagger";

class TrendDataDto {
  @ApiProperty({ example: "2024-01-01" })
  date: string;

  @ApiProperty({ example: 10 })
  count: number;
}

export class JobTrendsResponseDto {
  @ApiProperty({ type: [TrendDataDto] })
  data: TrendDataDto[];
}
