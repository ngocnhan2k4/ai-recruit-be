import { SchoolTypeEnum } from "@/core";
import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";

export class CreateSchoolDto {
  @ApiProperty({ enum: SchoolTypeEnum })
  @IsEnum(SchoolTypeEnum)
  schoolType: SchoolTypeEnum;
}
