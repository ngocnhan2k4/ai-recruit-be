import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsUUID,
  IsNotEmpty,
  IsArray,
  ArrayMinSize,
  IsString,
  ValidateNested,
  IsOptional,
  IsIn,
} from "class-validator";
import { Type } from "class-transformer";

export class StartExamDto {
  @ApiProperty({
    example: "123e4567-e89b-12d3-a456-426614174001",
    description: "Select 1 skill to test",
  })
  @IsUUID("4")
  @IsNotEmpty()
  skillId: string;

  @ApiProperty({
    example: ["easy", "medium"],
    type: [String],
    required: false,
    description:
      "Optional: Filter by difficulty levels. If not provided, random mix of all difficulties",
  })
  @IsArray()
  @IsOptional()
  @IsIn(["easy", "medium", "hard", "advanced", "expert"], { each: true })
  difficultyLevels?: string[];
}

export class AnswerDto {
  @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000" })
  @IsUUID()
  @IsNotEmpty()
  questionId: string;

  @ApiProperty({ example: "A programming language" })
  @IsString()
  @IsNotEmpty()
  chosenAnswer: string;
}

export class SubmitExamDto {
  @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000" })
  @IsUUID()
  @IsNotEmpty()
  userTestId: string;

  @ApiProperty({ type: [AnswerDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}

export class SavePartialAnswersDto {
  @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000" })
  @IsUUID()
  @IsNotEmpty()
  userTestId: string;

  @ApiProperty({ type: [AnswerDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}

export class GetUserTestsQueryDto {
  @ApiPropertyOptional({
    format: "uuid",
    description: "Filter user tests by selected skill ID",
  })
  @IsOptional()
  @IsUUID("4")
  skillId?: string;
}
