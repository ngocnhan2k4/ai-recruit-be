import { ApiProperty } from "@nestjs/swagger";
import { GeneralQueryDto } from "../../common/query";
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

export class UpdateFeedbackRequestDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(FeedbackStatusEnum)
  status?: FeedbackStatusEnum;
}
