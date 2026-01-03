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
