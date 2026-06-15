import { IsInt, Min } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SaveQuizResultDto {
  @ApiProperty({ description: "Number of correct answers" })
  @IsInt()
  @Min(0)
  score: number;

  @ApiProperty({ description: "Total number of questions in module" })
  @IsInt()
  @Min(1)
  totalQuestions: number;
}
