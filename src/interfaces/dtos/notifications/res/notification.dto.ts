import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";
import { NotificationStatusEnum, NotificationType } from "@/core";

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
    orgInvitationId?: string;
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

  orgInvitation?: {
    status?: string | null;
  } | null;
}

export class GetNotificationResponseDto {
  @ApiProperty({ type: NotificationDto })
  notification: NotificationDto;
}

export class NotificationActionResponseDto {
  @ApiProperty({ type: "number" })
  count: number;
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
