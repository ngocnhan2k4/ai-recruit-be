import { GenderEnum } from "@/core";
import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString } from "class-validator";

export class UserOnboardingDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  name?: string | null;

  @ApiProperty()
  @IsString()
  @IsOptional()
  gender?: GenderEnum | null;

  @ApiProperty()
  @IsString()
  @IsOptional()
  dob?: string | null;

  @ApiProperty()
  @IsString()
  @IsOptional()
  currentGoal?: string | null;

  @ApiProperty({ type: [String] })
  @IsString({ each: true })
  @IsOptional()
  skills?: string[] | null;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  experienceYears?: number | null;
}
