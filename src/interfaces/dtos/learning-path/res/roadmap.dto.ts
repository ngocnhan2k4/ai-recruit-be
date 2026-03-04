import { ApiProperty } from "@nestjs/swagger";

export class RoadmapProgressStatsDto {
  @ApiProperty({
    description:
      "Total number of learning positions in roadmap (each position can have multiple skill options)",
    example: 8,
  })
  totalSkills: number;

  @ApiProperty({
    description:
      "Number of completed positions (a position is completed when user completes at least one skill option from it)",
    example: 3,
  })
  completedSkills: number;

  @ApiProperty({
    description: "Total number of phases",
    example: 5,
  })
  totalPhases: number;

  @ApiProperty({
    description: "Number of completed phases",
    example: 2,
  })
  completedPhases: number;

  @ApiProperty({
    description: "Overall progress percentage (0-100)",
    example: 48.5,
  })
  overallProgress: number;

  @ApiProperty({
    description: "Estimated completion date",
    example: "2026-03-15T00:00:00.000Z",
    nullable: true,
  })
  estimatedCompletionDate: Date | null;
}
