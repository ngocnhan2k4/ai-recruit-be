import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";
import {
  LearningRoadmapGenerationStatusEnum,
  NotificationStatusEnum,
  NotificationType,
  TaskStatusEnum,
  TaskTypeEnum,
} from "@/core";

export class TaskInNotificationDto {
  @ApiProperty({ type: "string" })
  id: string;

  @ApiProperty({ type: "string" })
  status: TaskStatusEnum;

  @ApiProperty({ enum: TaskTypeEnum })
  type: TaskTypeEnum;

  @ApiProperty({ nullable: true })
  result: Record<string, any> | null;
}

export class RoadmapInNotificationDto {
  @ApiProperty({ type: "string" })
  id: string;

  @ApiProperty({ enum: LearningRoadmapGenerationStatusEnum })
  generationStatus: LearningRoadmapGenerationStatusEnum;
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

  @ApiProperty({ type: "string", nullable: true, required: false })
  displayLanguage?: string | null;

  @ApiProperty({ type: "string", nullable: true, required: false })
  templateKey?: string | null;

  @ApiProperty({ enum: NotificationType })
  type: NotificationType;

  payload: {
    jobId?: string;
    orgId?: string;
    userId?: string;
    applyId?: string;
    orgInvitationId?: string;
    avatarUrl?: string;
    taskId?: string;
    roadmapId?: string;
    feedbackId?: string;
    blogId?: string;
    blogSlug?: string;
    commentId?: string;
    commentParentId?: string | null;
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

  @ApiProperty({ type: TaskInNotificationDto, nullable: true })
  task?: TaskInNotificationDto | null;

  @ApiProperty({ type: RoadmapInNotificationDto, nullable: true })
  roadmap?: RoadmapInNotificationDto | null;
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
