import { Type } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNumber, IsOptional, IsString } from "class-validator";

export type SortDirection = "asc" | "desc";

export class GeneralQueryDto {
  @ApiProperty({
    example: 10,
    required: false,
    description: "Number of items to return",
    minimum: 1,
    maximum: 100,
  })
  @Transform(({ value }: { value: string }) => {
    if (value === undefined || value === null || value === "") return 10;
    const n = parseInt(value, 10);
    return Number.isNaN(n) ? 10 : Math.min(100, Math.max(1, n));
  })
  @IsNumber()
  limit: number = 10;

  @ApiProperty({
    example: 1,
    required: false,
    description: "Number of items to skip",
  })
  @Transform(({ value }: { value: string }) => {
    if (value === undefined || value === null || value === "") return 1;
    const n = parseInt(value, 10);
    return Number.isNaN(n) ? 1 : Math.max(1, n);
  })
  @IsNumber()
  page: number = 1;

  @ApiProperty({
    required: false,
    description: "Field to sort by",
  })
  @IsOptional()
  @IsString()
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
