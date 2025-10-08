import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNumber, IsOptional, IsString } from "class-validator";

export type SortDirection = "asc" | "desc";

export class GeneralQueryDto {
  @ApiProperty({
    example: 0,
    required: false,
    description: "Number of items to return",
    minimum: 1,
    maximum: 100,
  })
  @Transform(({ value }: { value: string }) =>
    Math.min(parseInt(value, 10), 100),
  )
  @IsNumber()
  limit: number = 10;

  @ApiProperty({
    example: 0,
    required: false,
    description: "Number of items to skip",
  })
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsNumber()
  offset: number = 0;

  @ApiProperty({
    required: false,
    description: "Field to sort by",
  })
  sortBy?: string;

  @ApiProperty({
    required: false,
    description: "Sort direction (asc or desc)",
  })
  @Transform(({ value }: { value: string }) => {
    const val = value.toLowerCase();
    return val === "asc" || val === "desc" ? val : "asc";
  })
  sortDirection?: SortDirection = "asc";

  @ApiProperty({
    required: false,
    description: "Cursor for pagination",
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiProperty({
    required: false,
    description: "Keyword to search",
  })
  @IsOptional()
  @IsString()
  keyword?: string;
}

export class PaginationResponseDto {
  @ApiProperty({
    example: "<cursor>",
    required: false,
    description: "Cursor for the next page",
  })
  cursor?: string | null;

  @ApiProperty({
    example: true,
    required: false,
    description: "Indicates if there is a next page",
  })
  hasNextPage?: boolean;

  @ApiProperty({
    example: 100,
    required: false,
    description: "Total number of items available",
  })
  total?: number;
}

export class PaginatedResult<T> {
  @ApiProperty({ isArray: true })
  data: T[];

  @ApiProperty({ type: PaginationResponseDto })
  pagination: PaginationResponseDto;
}
