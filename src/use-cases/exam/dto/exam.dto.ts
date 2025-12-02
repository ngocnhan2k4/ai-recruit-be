import { ApiProperty } from "@nestjs/swagger";
import {
  IsUUID,
  IsNotEmpty,
  IsArray,
  ArrayMaxSize,
  ArrayMinSize,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class StartExamDto {
  @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000" })
  @IsUUID()
  @IsNotEmpty()
  areaId: string;

  @ApiProperty({
    example: [
      "123e4567-e89b-12d3-a456-426614174001",
      "123e4567-e89b-12d3-a456-426614174002",
    ],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsUUID("4", { each: true })
  skillIds: string[];
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
