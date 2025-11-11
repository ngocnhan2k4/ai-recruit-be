import { ApiProperty } from "@nestjs/swagger";
import { GeneralQueryDto, PaginationResponseDto } from "../common/query";
import { IsArray, IsEnum, IsDate, IsOptional, IsString } from "class-validator";
import { FeedbackStatusEnum } from "@/core/entities/enum.entity";

export class CreateFeedbackRequestDto {
  @ApiProperty({ description: "Name of the user submitting feedback" })
  @IsString()
  name: string;

  @ApiProperty({ description: "Subject of the feedback" })
  @IsString()
  subject: string;

  @ApiProperty({ description: "Message content" })
  @IsString()
  message: string;

  @ApiProperty({
    description: "Array of image URLs",
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}

export class FeedbackDto {
  @ApiProperty({ type: "string" })
  id: string;

  @ApiProperty({ type: "string" })
  status: FeedbackStatusEnum;

  @ApiProperty({ type: "string", nullable: true })
  userId: string | null;

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

export class GetFeedbacksRequestDto extends GeneralQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(FeedbackStatusEnum)
  status?: FeedbackStatusEnum;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  startDate?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  endDate?: Date;
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

export class UpdateFeedbackRequestDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(FeedbackStatusEnum)
  status?: FeedbackStatusEnum;
}
