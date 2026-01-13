import { IsDate, IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class CreateUserExperienceRequestDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  organizationName?: string;

  @ApiProperty()
  @IsString()
  jobTitle: string;

  @ApiProperty()
  @IsString()
  position: string;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @ApiProperty()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsString({ each: true })
  skillIds?: string[];

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsString({ each: true })
  skillNames?: string[];
}

export class UpdateUserExperienceRequestDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  description: string;

  @ApiProperty()
  @IsString()
  startDate: Date;

  @ApiProperty()
  @IsString()
  endDate: Date;

  @ApiProperty()
  @IsString()
  position: string;

  @ApiProperty()
  @IsString()
  jobTitle: string;

  @ApiProperty()
  @IsString()
  companyId: string;

  @ApiProperty()
  @IsString()
  companyName: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsString({ each: true })
  skillIds?: string[];

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsString({ each: true })
  skillNames?: string[];
}
