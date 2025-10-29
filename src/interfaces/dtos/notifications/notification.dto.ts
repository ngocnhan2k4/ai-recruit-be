import { ApiProperty } from "@nestjs/swagger";
import { GeneralQueryDto } from "../common/query";
import { IsOptional, IsString, IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { NotificationType } from "@/core";

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
}

export class GetNotificationResponseDto {
  @ApiProperty({ type: NotificationDto })
  notification: NotificationDto;
}

export class NotificationRecipientDto {
  @ApiProperty({ type: "string" })
  @IsString()
  receiverId: string;

  @ApiProperty({ type: "string", required: false })
  @IsOptional()
  @IsString()
  organizationId?: string;
}

export class CreateNotificationRequestDto {
  @ApiProperty({ type: "string", required: false })
  @IsOptional()
  @IsString()
  senderId?: string;

  @ApiProperty({ type: "string" })
  @IsString()
  title: string;

  @ApiProperty({ type: "string" })
  @IsString()
  message: string;

  @ApiProperty({ enum: NotificationType })
  @IsString()
  type: NotificationType;

  @ApiProperty({ required: false })
  @IsOptional()
  payload?: {
    jobId?: string;
    orgId?: string;
    userId?: string;
    applyId?: string;
  };

  @ApiProperty({
    type: [NotificationRecipientDto],
    description: "Array of notification recipients",
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotificationRecipientDto)
  recipients: NotificationRecipientDto[];
}

export class CreateNotificationResponseDto {
  @ApiProperty({ type: [NotificationDto] })
  notifications: NotificationDto[];
}

export class NotificationActionRequestDto {
  @ApiProperty({
    type: [String],
    description: "Array of user notification IDs",
  })
  @IsArray()
  @IsString({ each: true })
  userNotificationIds: string[];
}

export class NotificationActionResponseDto {
  @ApiProperty({ type: "number" })
  count: number;
}

export class UpdateNotificationStatusDto {
  @ApiProperty({
    enum: ["read", "deleted"],
    description: "Status to update: read or deleted",
  })
  @IsString()
  status: "read" | "deleted";
}
