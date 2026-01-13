import { ApiProperty } from "@nestjs/swagger";

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
