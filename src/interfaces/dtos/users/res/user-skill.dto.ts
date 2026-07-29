import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class UserSkillDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Origin of the skill, e.g. "exam"',
  })
  source: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description:
      "Assessed level from latest qualifying exam: Beginner | Intermediate | Advanced",
  })
  level: string | null;
}

export class DeleteUserSkillResponseDto {
  @ApiProperty()
  skillId: string;

  @ApiProperty({ nullable: true })
  organizationId: string | null;
}
