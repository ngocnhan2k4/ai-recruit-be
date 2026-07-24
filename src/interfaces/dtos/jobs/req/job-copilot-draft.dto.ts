import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsInt, IsObject, IsOptional, Min } from "class-validator";
import type { SaveJobCopilotDraft } from "@/core";

export class SaveJobCopilotDraftDto implements SaveJobCopilotDraft {
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
