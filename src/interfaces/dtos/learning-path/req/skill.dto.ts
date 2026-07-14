import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsUUID, MaxLength } from "class-validator";

export class CompleteSkillDto {
  @ApiProperty({
    description: "Skill option ID to mark as completed",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsUUID()
  optionId: string;
}

export class AddSkillToRoadmapDto {
  @ApiProperty({ example: "React" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  skillName: string;

  @ApiProperty({ example: "uuid-of-phase" })
  @IsString()
  @IsNotEmpty()
  phaseId: string;
}

export class AddOptionToSkillDto {
  @ApiProperty({ example: "Svelte" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  optionName: string;
}

export class MoveSkillToPhaseDto {
  @IsString()
  @IsNotEmpty()
  targetPhaseId: string;
}
