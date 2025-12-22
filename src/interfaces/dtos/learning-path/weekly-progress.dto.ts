import { IsInt, IsNumber, Min } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateWeeklyHoursDto {
  @ApiProperty({
    description: "Week number (1, 2, 3...)",
    example: 3,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  weekNumber: number;

  @ApiProperty({
    description: "Total hours spent studying this week",
    example: 12.5,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  hoursSpent: number;
}

export class ScheduledSkillDto {
  @ApiProperty({ description: "Skill ID" })
  skillId: string;

  @ApiProperty({ description: "Skill name" })
  skillName: string;

  @ApiProperty({ description: "Whether the skill is completed" })
  isCompleted: boolean;
}

export class WeeklyProgressResponseDto {
  @ApiProperty({ description: "Week number" })
  weekNumber: number;

  @ApiProperty({ description: "Hours spent this week" })
  hoursSpent: number;

  @ApiProperty({ description: "Number of skills completed this week" })
  skillsCompletedThisWeek: number;

  @ApiProperty({ description: "Target hours per week from roadmap" })
  targetHours: number;

  @ApiProperty({
    description: "Skills scheduled for this week",
    type: [ScheduledSkillDto],
  })
  scheduledSkills: ScheduledSkillDto[];
}

export class CurrentWeekSkillsResponseDto {
  @ApiProperty({ description: "Current week number" })
  currentWeek: number;

  @ApiProperty({ description: "Skills for current week" })
  skills: any[];
}
