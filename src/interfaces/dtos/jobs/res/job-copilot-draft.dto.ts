import { ApiProperty } from "@nestjs/swagger";
import type { JobCopilotDraftRecord } from "@/core";

export class JobCopilotDraftResponseDto implements JobCopilotDraftRecord {
  @ApiProperty()
  id: string;
  @ApiProperty()
  organizationId: string;
  @ApiProperty()
  createdBy: string;
  @ApiProperty({ type: Object })
  formData: JobCopilotDraftRecord["formData"];
  @ApiProperty({ type: Object, nullable: true })
  analysisResult: JobCopilotDraftRecord["analysisResult"];
  @ApiProperty({ type: Object, nullable: true })
  analyzedContent: JobCopilotDraftRecord["analyzedContent"];
  @ApiProperty({ type: [Object] })
  screeningQuestions: JobCopilotDraftRecord["screeningQuestions"];
  @ApiProperty({ type: Object })
  suggestionStatuses: JobCopilotDraftRecord["suggestionStatuses"];
  @ApiProperty()
  version: number;
  @ApiProperty()
  createdAt: Date;
  @ApiProperty({ nullable: true })
  updatedAt: Date | null;
  @ApiProperty({ nullable: true })
  deletedAt: Date | null;
}
