import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNumber, IsOptional, IsString } from "class-validator";

export type SortDirection = "asc" | "desc";

export class GeneralQueryDto {
  @ApiProperty({
    example: 0,
    required: false,
    description: "Number of items to return",
  })
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsNumber()
  limit?: number = 10;

  @ApiProperty({
    example: 0,
    required: false,
    description: "Number of items to skip",
  })
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsNumber()
  offset?: number = 0;

  @ApiProperty({
    example: "date_posted",
    required: false,
    description: "Field to sort by",
  })
  sortBy?: string = "date_posted";

  @ApiProperty({
    example: "asc",
    required: false,
    description: "Sort direction (asc or desc)",
  })
  @Transform(({ value }: { value: string }) => {
    const val = value.toLowerCase();
    return val === "asc" || val === "desc" ? val : "asc";
  })
  sortDirection?: SortDirection = "asc";

  @ApiProperty({
    example: "<cursor>",
    required: false,
    description: "Cursor for pagination",
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiProperty({
    example: "developer",
    required: false,
    description: "Keyword to search",
  })
  @IsOptional()
  @IsString()
  keyword?: string;
}
