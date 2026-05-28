import { ApiProperty } from "@nestjs/swagger";
import {
  FeedbackStatusEnum,
  FeedbackTypeEnum,
} from "@/core/entities/enum.entity";
import { RelatedEntityDto } from "../..";

export class FeedbackDto {
  @ApiProperty({ type: "string" })
  id: string;

  @ApiProperty({ type: "string" })
  status: FeedbackStatusEnum;

  @ApiProperty({ type: "string", nullable: true })
  userId: string | null;

  @ApiProperty({
    type: "string",
    nullable: true,
    description: "User id of the assigned handler (admin/staff)",
  })
  assignedToUserId: string | null;

  @ApiProperty({ type: "string" })
  name: string;

  @ApiProperty({ type: "string" })
  subject: string;

  @ApiProperty({ type: "string" })
  message: string;

  @ApiProperty({ type: [String], nullable: true })
  images: string[] | null;

  @ApiProperty({
    enum: FeedbackTypeEnum,
    description: "Record type (`feedback` or `survey`).",
  })
  type: FeedbackTypeEnum;

  @ApiProperty({
    type: Object,
    additionalProperties: true,
    nullable: true,
    description:
      "Free-form JSON payload. UX surveys store their answers and `surveyKey` here.",
  })
  metadata: Record<string, unknown> | null;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date, nullable: true })
  updatedAt: Date | null;
}

export class CreateFeedbackResponseDto {
  @ApiProperty({ type: FeedbackDto })
  feedback: FeedbackDto;
}

export class GetFeedbacksResponseDto extends FeedbackDto {
  @ApiProperty({ type: RelatedEntityDto, nullable: true })
  assignedToUser?: RelatedEntityDto | null;
}

export class GetSubmittedSurveysResponseDto {
  @ApiProperty({
    type: [String],
    description:
      "Distinct `metadata.surveyKey` values this user has submitted.",
  })
  surveyKeys: string[];
}
