import { ApiProperty } from "@nestjs/swagger";
import { GeneralQueryDto } from "../common/query";
import { IsOptional, IsString } from "class-validator";
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
