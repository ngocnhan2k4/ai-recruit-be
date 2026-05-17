import { IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpsertSkillNoteDto {
  @ApiProperty({
    description: "Markdown content of the note",
  })
  @IsString()
  content: string;
}
