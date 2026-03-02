import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsUUID,
  IsNumber,
  IsBoolean,
  IsOptional,
  ArrayMinSize,
  ArrayMaxSize,
  Min,
  IsIn,
} from "class-validator";

export enum DifficultyEnum {
  EASY = "easy",
  MEDIUM = "medium",
  HARD = "hard",
  ADVANCED = "advanced",
  EXPERT = "expert",
}

export class CreateQuestionDto {
  @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000" })
  @IsUUID()
  @IsNotEmpty()
  skillId: string;

  @ApiProperty({ example: "What is TypeScript?" })
  @IsString()
  @IsNotEmpty()
  questionText: string;

  @ApiProperty({
    example: ["A programming language", "A framework", "A library", "A tool"],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  options: string[];

  @ApiProperty({ example: "A programming language" })
  @IsString()
  @IsNotEmpty()
  correctAnswer: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(1)
  point: number;

  @ApiProperty({
    example: ["medium"],
    type: [String],
    description: "Array of 1-3 difficulty levels",
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsIn(["easy", "medium", "hard", "advanced", "expert"], { each: true })
  difficultyLevels: string[];

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateQuestionDto extends PartialType(CreateQuestionDto) {}

export class ToggleQuestionStatusDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isActive: boolean;
}

export class AddQuestionsToSkillDto {
  @ApiProperty({
    example: ["123e4567-e89b-12d3-a456-426614174000"],
    type: [String],
    description: "Question IDs to assign to this skill",
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID("4", { each: true })
  questionIds: string[];
}

export class QueryQuestionsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  skillId?: string;

  @ApiPropertyOptional({
    description:
      "Exclude questions belonging to this skill (for add-to-skill picker)",
  })
  @IsOptional()
  @IsUUID()
  excludeSkillId?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ["easy", "medium"],
  })
  @IsOptional()
  @IsArray()
  @IsIn(["easy", "medium", "hard", "advanced", "expert"], { each: true })
  difficultyLevels?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  keyword?: string;
}
