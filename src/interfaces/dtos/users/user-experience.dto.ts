import { IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UserExperienceDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  companyId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  jobTitle: string;

  @ApiProperty()
  position: string;

  @ApiProperty()
  startDate: string;

  @ApiProperty()
  endDate: string | null;

  @ApiProperty()
  description: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date | null;

  @ApiProperty()
  deletedAt: Date | null;
}

export class CreateUserExperienceRequestDto {
  @ApiProperty()
  @IsString()
  companyId: string;

  @ApiProperty()
  @IsString()
  jobTitle: string;

  @ApiProperty()
  @IsString()
  position: string;

  @ApiProperty()
  @IsString()
  startDate: Date;

  @ApiProperty()
  @IsString()
  endDate: Date;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description: string;
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
}
