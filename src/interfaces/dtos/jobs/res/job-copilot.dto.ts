import { ApiProperty } from "@nestjs/swagger";
import type {
  JobCopilotGeneratedDraft,
  JobCopilotResponse,
  JobCopilotSuggestedSkill,
  JobQuality,
  JobQualityCriterion,
  JobQualityCriterionKey,
  JobQualityLabel,
  JobSuggestion,
  JobSuggestionResolutionKind,
  JobSuggestionSeverity,
  JobSuggestionTarget,
  JobSuggestionType,
  ScreeningQuestion,
  ScreeningQuestionType,
} from "@/core/entities/job-copilot.entity";

export class JobCopilotSuggestedSkillDto implements JobCopilotSuggestedSkill {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}

export class JobCopilotGeneratedDraftDto implements JobCopilotGeneratedDraft {
  @ApiProperty()
  description: string;

  @ApiProperty()
  requirements: string;

  @ApiProperty()
  benefits: string;
}

export class JobQualityCriterionDto implements JobQualityCriterion {
  @ApiProperty()
  key: JobQualityCriterionKey;

  @ApiProperty()
  score: number;

  @ApiProperty()
  maxScore: number;

  @ApiProperty()
  explanation: string;

  @ApiProperty({ type: [String] })
  issues: string[];
}

export class JobQualityDto implements JobQuality {
  @ApiProperty()
  totalScore: number;

  @ApiProperty()
  label: JobQualityLabel;

  @ApiProperty({ type: [JobQualityCriterionDto] })
  criteria: JobQualityCriterionDto[];
}

export class JobSuggestionDto implements JobSuggestion {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ["missing_input", "content_improvement"] })
  type: JobSuggestionType;

  @ApiProperty({
    enum: [
      "salary",
      "title_category_conflict",
      "role_skills_conflict",
      "free_text",
    ],
  })
  resolutionKind: JobSuggestionResolutionKind;

  @ApiProperty()
  category: string;

  @ApiProperty()
  targetField: JobSuggestionTarget;

  @ApiProperty()
  currentText: string;

  @ApiProperty()
  replacementText: string;

  @ApiProperty()
  reason: string;

  @ApiProperty()
  severity: JobSuggestionSeverity;

  @ApiProperty()
  estimatedScoreGain: number;
}

export class ScreeningQuestionDto implements ScreeningQuestion {
  @ApiProperty()
  id: string;

  @ApiProperty()
  type: ScreeningQuestionType;

  @ApiProperty()
  text: string;

  @ApiProperty()
  enabled: boolean;
}

export class JobCopilotResponseDto implements JobCopilotResponse {
  @ApiProperty()
  analysisId: string;

  @ApiProperty({ enum: ["generate", "review"] })
  mode: "generate" | "review";

  @ApiProperty({ type: JobCopilotGeneratedDraftDto })
  draft: JobCopilotGeneratedDraftDto;

  @ApiProperty({ type: JobQualityDto })
  quality: JobQualityDto;

  @ApiProperty({ type: [JobSuggestionDto] })
  suggestions: JobSuggestionDto[];

  @ApiProperty({ type: [ScreeningQuestionDto] })
  screeningQuestions: ScreeningQuestionDto[];

  @ApiProperty({ type: [JobCopilotSuggestedSkillDto] })
  suggestedSkills: JobCopilotSuggestedSkillDto[];
}
