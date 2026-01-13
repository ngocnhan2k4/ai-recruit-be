import { ApiProperty } from "@nestjs/swagger";
import { JobResponseDto } from "./job.dto";

export class JobMatchResultDto extends JobResponseDto {
  @ApiProperty({
    description: "Match score - higher is better match",
    example: 85.5,
  })
  score: number;
}
