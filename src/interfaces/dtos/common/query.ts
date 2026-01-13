import { Type } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export type SortDirection = "asc" | "desc";

export class GeneralQueryDto {
  @ApiProperty({
    example: 10,
    required: false,
    description: "Number of items to return",
    minimum: 1,
    maximum: 100,
  })
  @Transform(({ value }: { value: string }) =>
    Math.min(parseInt(value, 10), 100),
  )
  @Min(1, { message: "Limit must be greater than or equal to 1" })
  @Max(100, { message: "Limit must be less than or equal to 100" })
  @IsNumber()
  limit: number = 10;

  @ApiProperty({
    example: 1,
    required: false,
    description: "Number of items to skip",
  })
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsNumber()
  @Min(1, { message: "Page number must be greater than or equal to 1" })
  page: number = 1;

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
  @IsOptional()
  @IsString()
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
  nextCursor?: string | number | null;

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

export class PaginatedResultDto<T> {
  @ApiProperty({ isArray: true })
  data: T[];

  @ApiProperty({ type: PaginationResponseDto })
  pagination: PaginationResponseDto;
}

export function PaginatedResultDecorator<TModel extends Type<any>>(
  model: TModel,
) {
  class PaginatedResult {
    @ApiProperty({ isArray: true, type: model })
    data: InstanceType<TModel>[];

    @ApiProperty({ type: PaginationResponseDto })
    pagination: PaginationResponseDto;
  }

  return PaginatedResult;
}
