import { GenderEnum } from "@/common/constants/roles";
import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

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
  skills?: string[] | null;
  experienceYears?: number | null;
  experienceDetail?: string | null;
}

export class UserOnboardingStatusDto {
  @ApiProperty()
  isOnboarded: boolean;
}
