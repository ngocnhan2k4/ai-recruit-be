import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class SkillSynonymResponseDto {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "Skill id in skills table",
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    example: ".net",
    description: "Master skill name",
  })
  masterName: string;

  @ApiProperty({
    type: [String],
    example: [".net core", "dotnet"],
    description: "Alias names of the master skill",
  })
  aliasNames: string[];
}
