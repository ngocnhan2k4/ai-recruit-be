export type CandidateBriefLocale = "vi" | "en";
export type CandidateGapStatus = "not_met" | "not_found";

export interface CandidateEvidence {
  quote: string;
  page: number;
}

export interface CandidateStrength {
  id: string;
  title: string;
  detail: string;
  evidence: CandidateEvidence[];
}

export interface CandidateGap {
  id: string;
  requirement: string;
  status: CandidateGapStatus;
  detail: string;
  evidence: CandidateEvidence[];
}

export interface CandidateVerificationQuestion {
  id: string;
  text: string;
  reason: string;
  relatedGapId?: string | null;
}

export interface CandidateBriefAnalysis {
  summary: string;
  strengths: CandidateStrength[];
  gaps: CandidateGap[];
  verificationQuestions: CandidateVerificationQuestion[];
}

export interface CandidateBriefJobInput {
  title: string;
  description: string;
  requirements: string;
  benefits: string;
  skills: string[];
  locations: string[];
  experienceMin?: number | null;
  experienceMax?: number | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  workType?: string | null;
}

export interface CandidateBriefAiRequest {
  locale: CandidateBriefLocale;
  cvUrl: string;
  job: CandidateBriefJobInput;
  matchingScore?: number | null;
  matchingCriteria: Record<string, unknown>;
  answers: Array<{ question: string; answer: string }>;
}

export interface CandidateBriefRecord {
  id: string;
  applicationId: string;
  organizationId: string;
  createdBy: string;
  analysisResult: CandidateBriefAnalysis;
  inputFingerprint: string;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date | null;
  deletedAt: Date | null;
}

export interface CandidateBriefView {
  brief: CandidateBriefRecord | null;
  isStale: boolean;
}
