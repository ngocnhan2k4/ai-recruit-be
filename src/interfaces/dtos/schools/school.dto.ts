import { SchoolTypeEnum } from "@/core";
import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty } from "class-validator";

export class SchoolDto {
  @ApiProperty({ type: "string", format: "uuid" })
  organizationId: string;

  @ApiProperty({ type: "string" })
  schoolType: string;
}

export class CreateSchoolDto {
  @ApiProperty({ enum: SchoolTypeEnum })
  @IsNotEmpty({ message: "School type is required" })
  @IsEnum(SchoolTypeEnum, {
    message: "School type must be a valid school type",
  })
  schoolType: SchoolTypeEnum;
}
