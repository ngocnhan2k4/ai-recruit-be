import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional } from "class-validator";

export class SyncFromElasticsearchRequestDto {
  @ApiProperty({
    description: "Source Elasticsearch node URL",
    example: "https://source-es.example.com:9200",
  })
  @IsString()
  sourceNode: string;

  @ApiPropertyOptional({
    description: "Source Elasticsearch username",
  })
  @IsOptional()
  @IsString()
  sourceUsername?: string;

  @ApiPropertyOptional({
    description: "Source Elasticsearch password",
  })
  @IsOptional()
  @IsString()
  sourcePassword?: string;

  @ApiProperty({
    description: "Source index name",
    example: "jobs",
  })
  @IsString()
  sourceIndex: string;

  @ApiPropertyOptional({
    description:
      "Target index name (defaults to current ELASTICSEARCH_INDEX_JOBS)",
  })
  @IsOptional()
  @IsString()
  targetIndex?: string;

  @ApiPropertyOptional({
    description: "Query to filter documents from source (optional)",
    example: { match: { status: "active" } },
  })
  @IsOptional()
  query?: any;
}
