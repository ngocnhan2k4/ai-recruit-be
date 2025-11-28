import { ApiProperty } from "@nestjs/swagger";
import { GeneralQueryDto } from "../common/query";
import { IsArray, IsOptional, IsString } from "class-validator";
import { NotificationStatusEnum, NotificationType } from "@/core";

export class GetNotificationRequestDto extends GeneralQueryDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  organizationId?: string;
}

export class NotificationDto {
  @ApiProperty({ type: "string" })
  id: string;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date, nullable: true })
  updatedAt: Date | null;

  @ApiProperty({ type: "string", nullable: true })
  senderId: string | null;

  @ApiProperty({ type: "string" })
  title: string;

  @ApiProperty({ type: "string" })
  message: string;

  @ApiProperty({ enum: NotificationType })
  type: NotificationType;

  payload: {
    jobId?: string;
    orgId?: string;
    userId?: string;
    applyId?: string;
  } | null;

  @ApiProperty({ type: "string", nullable: true })
  organizationId: string | null;

  @ApiProperty({ type: Date, nullable: true })
  readAt: Date | null;

  organization?: {
    name?: string | null;
    logoUrl?: string | null;
  } | null;

  sender?: {
    name?: string | null;
    avatarUrl?: string | null;
  } | null;
}

export class GetNotificationResponseDto {
  @ApiProperty({ type: NotificationDto })
  notification: NotificationDto;
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

export class NotificationActionResponseDto {
  @ApiProperty({ type: "number" })
  count: number;
}

export class UpdateNotificationStatusRequestDto {
  @ApiProperty({
    enum: NotificationStatusEnum,
    description: "Status to update: read or deleted",
  })
  @IsString()
  status: NotificationStatusEnum;
}

export class UpdateNotificationStatusResponseDto {
  notification: NotificationStatusDto;
}

export class NotificationStatusDto {
  @IsString()
  id: string;

  @IsString()
  status: NotificationStatusEnum;
}
