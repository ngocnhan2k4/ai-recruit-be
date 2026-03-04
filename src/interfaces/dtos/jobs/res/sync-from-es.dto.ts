import { ApiProperty } from "@nestjs/swagger";

export class SyncFromElasticsearchResponseDto {
  @ApiProperty({
    description: "Total number of documents synced",
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: "Time taken to sync documents",
    example: 1000,
  })
  took?: number;

  @ApiProperty({
    description: "Message",
    example: "Sync completed successfully",
  })
  message: string;
}
