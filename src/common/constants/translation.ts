export enum TranslationJobType {
  BLOG_POST = "translate_blog_post",
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
  [TranslationJobType.BLOG_POST]: TranslationPayloadBase & {
    postId: string;
  };
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
