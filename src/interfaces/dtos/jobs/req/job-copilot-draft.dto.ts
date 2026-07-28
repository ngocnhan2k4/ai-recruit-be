import { ApiProperty } from "@nestjs/swagger";
import {
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  Min,
} from "class-validator";
import type { SaveJobCopilotDraft } from "@/core";
import type { JobCopilotLocale } from "@/core";

export class JobCopilotDraftLocaleDto {
  @ApiProperty({ enum: ["vi", "en"] })
  @IsIn(["vi", "en"])
  locale: JobCopilotLocale;
}

export class SaveJobCopilotDraftDto implements SaveJobCopilotDraft {
  @ApiProperty({ enum: ["vi", "en"] })
  @IsIn(["vi", "en"])
  locale: JobCopilotLocale;

  @ApiProperty({ type: Object })
  @IsObject()
  formData: Record<string, unknown>;

  @ApiProperty({ type: Object, nullable: true })
  @IsOptional()
  @IsObject()
  analysisResult: SaveJobCopilotDraft["analysisResult"];

  @ApiProperty({ type: Object, nullable: true })
  @IsOptional()
  @IsObject()
  analyzedContent: SaveJobCopilotDraft["analyzedContent"];

  @ApiProperty({ type: [Object] })
  @IsArray()
  screeningQuestions: SaveJobCopilotDraft["screeningQuestions"];

  @ApiProperty({ type: Object })
  @IsObject()
  suggestionStatuses: SaveJobCopilotDraft["suggestionStatuses"];

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  expectedVersion: number;
}
