import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from "class-validator";
import type { SendJobCopilotMessage } from "@/core/entities";

export class SendJobCopilotMessageDto implements SendJobCopilotMessage {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @ApiProperty()
  @IsUUID()
  clientMessageId: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content: string;

  @ApiProperty({ enum: ["vi", "en"] })
  @IsIn(["vi", "en"])
  locale: "vi" | "en";
}

export class JobCopilotConversationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  conversationId?: string;
}

export class UndoJobCopilotRevisionDto {
  @ApiProperty({ enum: ["vi", "en"] })
  @IsIn(["vi", "en"])
  locale: "vi" | "en";
}
