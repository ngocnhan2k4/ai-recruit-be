import { ApiProperty } from "@nestjs/swagger";

export class UserSkillDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}

export class DeleteUserSkillResponseDto {
  @ApiProperty()
  skillId: string;

  @ApiProperty({ nullable: true })
  organizationId: string | null;
}
