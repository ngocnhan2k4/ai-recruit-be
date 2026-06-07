export enum TranslationJobType {
  QUESTION = "translate_question",
  ROADMAP_PHASE = "translate_roadmap_phase",
  ROADMAP_SKILL = "translate_roadmap_skill",
}

export const TRANSLATION_SUPPORTED_LANGUAGES = ["vi", "en"] as const;

export type TranslationPayloadBase = {
  sourceLanguage?: string;
  targetLanguages?: string[];
};

export type TranslationJobDataMap = {
  [TranslationJobType.QUESTION]: TranslationPayloadBase & {
    questionId: string;
  };
  [TranslationJobType.ROADMAP_PHASE]: TranslationPayloadBase & {
    phaseId: string;
  };
  [TranslationJobType.ROADMAP_SKILL]: TranslationPayloadBase & {
    skillId: string;
  };
};

export type TranslationJobData =
  TranslationJobDataMap[keyof TranslationJobDataMap];
