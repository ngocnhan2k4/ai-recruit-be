import { ApiProperty } from "@nestjs/swagger";

export class SkillNoteDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  roadmapSkillId: string;

  @ApiProperty()
  content: string;
}

export class SkillNoteForStudyGuideDto {
  @ApiProperty()
  skillName: string;

  @ApiProperty()
  phaseName: string;

  @ApiProperty()
  content: string;
}
