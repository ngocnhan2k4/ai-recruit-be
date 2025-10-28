import { GenderEnum } from "@/core";
import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsString } from "class-validator";

export class UserOnboardingDto {
  @ApiProperty()
  @IsString()
  name?: string | null;
  @ApiProperty()
  @IsString()
  gender?: GenderEnum | null;
  @ApiProperty()
  @IsString()
  dob?: string | null;
  @ApiProperty()
  @IsString()
  educationLevel?: string | null;
  @ApiProperty()
  @IsString()
  major?: string | null;
  @ApiProperty()
  @IsString()
  school?: string | null;
  @ApiProperty()
  @IsString()
  currentGoal?: string | null;
  @ApiProperty({ type: [String] })
  @IsString({ each: true })
  skills?: string[] | null;
  @ApiProperty()
  @IsNumber()
  experienceYears?: number | null;
  @ApiProperty()
  @IsString()
  experienceDetails?: string | null;
}

export class UserOnboardingStatusDto {
  @ApiProperty()
  isOnboarded: boolean;
}
