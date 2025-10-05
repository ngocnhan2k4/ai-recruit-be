import { IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { CompanyDto } from "../companies/company.dto";
import { SkillDto } from "../skills/skill.dto";

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

export class UserExperiencesResponseDto {
  @ApiProperty({ type: UserExperienceDto })
  experience: Omit<UserExperienceDto, "createdAt" | "updatedAt" | "deletedAt">;

  @ApiProperty({ type: CompanyDto })
  company: Pick<CompanyDto, "id" | "name" | "logoUrl" | "address"> | null;

  @ApiProperty({ type: [SkillDto] })
  skills: SkillDto[];
}
