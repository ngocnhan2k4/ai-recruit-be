import { ApiProperty } from "@nestjs/swagger";
import { Type, Transform } from "class-transformer";
import {
  IsOptional,
  IsString,
  IsDate,
  IsArray,
  IsNumber,
} from "class-validator";

export class CompareStatisticsFilterRequestDto {
  @ApiProperty({ type: Date, example: "2023-01-01" })
  @Type(() => Date)
  @IsDate()
  fromDate: Date;

  @ApiProperty({ type: Date, example: "2023-12-31" })
  @Type(() => Date)
  @IsDate()
  toDate: Date;

  @ApiProperty({
    type: [String],
    example: ["cat-uuid-1", "cat-uuid-2"],
    description:
      "Array of category IDs to compare. If empty, compares all categories.",
  })
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === "string") {
      return value.split(",").filter((v) => v.trim());
    }
    return value as string[];
  })
  categoryIds: string[];

  @ApiProperty({ type: String, example: "province-uuid", required: false })
  @IsOptional()
  @IsString()
  provinceId: string;

  @ApiProperty({
    type: Number,
    example: 5,
    required: false,
    description:
      "Max number of categories to return. When set and categoryIds exceeds this, returns top N by job count.",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}
