import { IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { EducationLevelEnum } from "src/core/entities/enum.entity";

export class CreateUserEducationDto {
  @ApiProperty()
  @IsString()
  schoolId: string;

  @ApiProperty()
  @IsString()
  startDate: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  educationLevel?: EducationLevelEnum;

  @ApiProperty()
  @IsOptional()
  @IsString()
  major?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  gpa?: string;

  @ApiProperty({ required: false, example: "vi" })
  @IsOptional()
  @IsString()
  languageCode?: string;
}

export class UpdateUserEducationDto {
  @ApiProperty()
  @IsString()
  startDate: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  educationLevel?: EducationLevelEnum;

  @ApiProperty()
  @IsOptional()
  @IsString()
  major?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  gpa?: string;
}
