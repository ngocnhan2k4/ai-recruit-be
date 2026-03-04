import { ApiProperty } from "@nestjs/swagger";
import { GeneralQueryDto } from "../../common/query";
import { IsArray, IsOptional, IsString } from "class-validator";
import { NotificationStatusEnum } from "@/core";

export class GetNotificationRequestDto extends GeneralQueryDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  organizationId?: string;
}

export class NotificationActionRequestDto {
  @ApiProperty({
    type: [String],
    description: "Array of user notification IDs",
  })
  @IsArray()
  @IsString({ each: true })
  userNotificationIds: string[];

  @IsString()
  status: NotificationStatusEnum;
}

export class UpdateNotificationStatusRequestDto {
  @ApiProperty({
    enum: NotificationStatusEnum,
    description: "Status to update: read or deleted",
  })
  @IsString()
  status: NotificationStatusEnum;
}
