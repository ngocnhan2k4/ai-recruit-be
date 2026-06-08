import { ApiProperty } from "@nestjs/swagger";
import { SkillDto } from "@/interfaces/dtos/skills/res/skill.dto";
import { OrganizationDto } from "@/interfaces/dtos/organization/res/organization-base.dto";

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
