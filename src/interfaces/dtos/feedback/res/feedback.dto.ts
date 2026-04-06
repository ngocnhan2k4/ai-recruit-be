import { ApiProperty } from "@nestjs/swagger";
import { PaginationResponseDto } from "../../common/query";
import { FeedbackStatusEnum } from "@/core/entities/enum.entity";

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

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date, nullable: true })
  updatedAt: Date | null;
}

export class CreateFeedbackResponseDto {
  @ApiProperty({ type: FeedbackDto })
  feedback: FeedbackDto;
}

export class GetFeedbacksResponseDto {
  @ApiProperty({
    type: [FeedbackDto],
    description: "Array of job responses",
  })
  data: FeedbackDto[];

  @ApiProperty({
    type: PaginationResponseDto,
  })
  pagination: PaginationResponseDto;
}
