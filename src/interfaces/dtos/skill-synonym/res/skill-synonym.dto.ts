import { ApiProperty } from "@nestjs/swagger";

export class SkillSynonymResponseDto {
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
