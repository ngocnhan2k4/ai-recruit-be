import { IsDate, IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { SkillDto } from "../skills/skill.dto";
import { Type } from "class-transformer";
import { OrganizationDto } from "..";

export class UserExperienceDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  jobTitle: string;

  @ApiProperty()
  position: string;

  @ApiProperty()
  startDate: string;

  @ApiProperty({ type: String, nullable: true })
  endDate: string | null;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date, nullable: true })
  updatedAt: Date | null;

  @ApiProperty({ type: Date, nullable: true })
  deletedAt: Date | null;
}

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

export class UserExperiencesResponseDto {
  @ApiProperty({ type: UserExperienceDto })
  experience: Omit<UserExperienceDto, "createdAt" | "updatedAt" | "deletedAt">;

  @ApiProperty({ type: OrganizationDto })
  organization: Pick<
    OrganizationDto,
    "id" | "name" | "logoUrl" | "address"
  > | null;

  @ApiProperty({ type: [SkillDto] })
  skills: SkillDto[];
}
