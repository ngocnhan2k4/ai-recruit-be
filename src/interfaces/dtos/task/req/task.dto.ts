import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDate, IsEnum, IsOptional, IsUUID } from "class-validator";
import { GeneralQueryDto } from "../../common/query";
import { TaskStatusEnum, TaskTypeEnum } from "@/core/entities/enum.entity";

export class GetTasksRequestDto extends GeneralQueryDto {
  @ApiProperty({
    required: false,
    enum: TaskStatusEnum,
    description: "Filter by task status",
  })
  @IsOptional()
  @IsEnum(TaskStatusEnum)
  status?: TaskStatusEnum;

  @ApiProperty({
    required: false,
    enum: TaskTypeEnum,
    description: "Filter by task type",
  })
  @IsOptional()
  @IsEnum(TaskTypeEnum)
  type?: TaskTypeEnum;

  @ApiProperty({
    required: false,
    description: "Filter by the user that owns the task",
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({
    required: false,
    description: "Filter tasks created from this date (inclusive)",
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiProperty({
    required: false,
    description: "Filter tasks created up to this date (inclusive)",
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;
}
