import { ApiProperty } from "@nestjs/swagger";
import { TaskStatusEnum, TaskTypeEnum } from "@/core/entities/enum.entity";

export class TaskUserDto {
  @ApiProperty({ type: "string" })
  id: string;

  @ApiProperty({ type: "string", nullable: true })
  name: string | null;

  @ApiProperty({ type: "string", nullable: true })
  email?: string | null;
}

export class TaskDto {
  @ApiProperty({ type: "string" })
  id: string;

  @ApiProperty({ type: "string" })
  name: string;

  @ApiProperty({ enum: TaskStatusEnum })
  status: TaskStatusEnum;

  @ApiProperty({ enum: TaskTypeEnum })
  type: TaskTypeEnum;

  @ApiProperty({ type: "string" })
  userId: string;

  @ApiProperty({
    type: "object",
    nullable: true,
    additionalProperties: true,
    description: "Original input payload submitted for the task",
  })
  input: unknown;

  @ApiProperty({
    type: "object",
    nullable: true,
    additionalProperties: true,
    description: "Result payload, available when task is completed",
  })
  result: unknown;

  @ApiProperty({
    type: "string",
    nullable: true,
    description: "Error details if the task failed",
  })
  error: string | null;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date, nullable: true })
  updatedAt: Date | null;
}

export class GetTasksResponseDto extends TaskDto {
  @ApiProperty({ type: TaskUserDto, nullable: true })
  user?: TaskUserDto | null;
}
