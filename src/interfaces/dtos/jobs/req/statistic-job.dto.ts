import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, IsString, IsDate } from "class-validator";

export class StatisticsJobFilterRequestDto {
  @ApiProperty({ type: Date, example: "2023-01-01" })
  @Type(() => Date)
  @IsDate()
  fromDate: Date;

  @ApiProperty({ type: Date, example: "2023-12-31" })
  @Type(() => Date)
  @IsDate()
  toDate: Date;

  @ApiProperty({ type: String, example: "category-uuid" })
  @IsString()
  @IsOptional()
  categoryId: string;

  @ApiProperty({ type: String, example: "province-uuid", required: false })
  @IsOptional()
  @IsString()
  provinceId: string;
}
