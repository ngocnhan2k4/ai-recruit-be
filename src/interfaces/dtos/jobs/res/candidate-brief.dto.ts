import { ApiProperty } from "@nestjs/swagger";
import type {
  CandidateBriefAnalysis,
  CandidateBriefRecord,
  CandidateBriefView,
  CandidateEvidence,
  CandidateGap,
  CandidateGapStatus,
  CandidateStrength,
  CandidateVerificationQuestion,
} from "@/core";

export class CandidateEvidenceDto implements CandidateEvidence {
  @ApiProperty()
  quote: string;

  @ApiProperty()
  page: number;
}

export class CandidateStrengthDto implements CandidateStrength {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  detail: string;

  @ApiProperty({ type: [CandidateEvidenceDto] })
  evidence: CandidateEvidenceDto[];
}

export class CandidateGapDto implements CandidateGap {
  @ApiProperty()
  id: string;

  @ApiProperty()
  requirement: string;

  @ApiProperty({ enum: ["not_met", "not_found"] })
  status: CandidateGapStatus;

  @ApiProperty()
  detail: string;

  @ApiProperty({ type: [CandidateEvidenceDto] })
  evidence: CandidateEvidenceDto[];
}

export class CandidateVerificationQuestionDto
  implements CandidateVerificationQuestion
{
  @ApiProperty()
  id: string;

  @ApiProperty()
  text: string;

  @ApiProperty()
  reason: string;

  @ApiProperty({ required: false, nullable: true })
  relatedGapId?: string | null;
}

export class CandidateBriefAnalysisDto implements CandidateBriefAnalysis {
  @ApiProperty()
  summary: string;

  @ApiProperty({ type: [CandidateStrengthDto] })
  strengths: CandidateStrengthDto[];

  @ApiProperty({ type: [CandidateGapDto] })
  gaps: CandidateGapDto[];

  @ApiProperty({ type: [CandidateVerificationQuestionDto] })
  verificationQuestions: CandidateVerificationQuestionDto[];
}

export class CandidateBriefRecordDto implements CandidateBriefRecord {
  @ApiProperty()
  id: string;

  @ApiProperty()
  applicationId: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  createdBy: string;

  @ApiProperty({ type: CandidateBriefAnalysisDto })
  analysisResult: CandidateBriefAnalysisDto;

  @ApiProperty()
  inputFingerprint: string;

  @ApiProperty()
  generatedAt: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ nullable: true })
  updatedAt: Date | null;

  @ApiProperty({ nullable: true })
  deletedAt: Date | null;
}

export class CandidateBriefViewDto implements CandidateBriefView {
  @ApiProperty({ type: CandidateBriefRecordDto, nullable: true })
  brief: CandidateBriefRecordDto | null;

  @ApiProperty()
  isStale: boolean;
}
