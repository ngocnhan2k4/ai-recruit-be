import { Logger, Inject } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { and, eq, isNull, sql } from "drizzle-orm";
import {
  TRANSLATION_QUEUE,
  TranslationJobData,
  TranslationJobDataMap,
  TranslationJobType,
  TranslationPayloadBase,
} from "@/common/constants";
import type { DBDrizzle } from "@/frameworks/data-services/postgres/types";
import {
  questions,
  questionTranslation,
  roadmapPhases,
  roadmapPhaseTranslation,
  roadmapSkills,
  roadmapSkillTranslation,
} from "@/frameworks/data-services/postgres/models";
import { GoogleTranslationService } from "@/frameworks/translation/google-translation.service";

@Processor(TRANSLATION_QUEUE, {
  concurrency: 2,
})
export class TranslationWorker extends WorkerHost {
  private readonly logger = new Logger(TranslationWorker.name);

  constructor(
    @Inject("DRIZZLE") private readonly db: DBDrizzle,
    private readonly translator: GoogleTranslationService,
  ) {
    super();
  }

  async process(job: Job<TranslationJobData, void, TranslationJobType>) {
    try {
      const type = job.name;
      const jobName = String(job.name);
      const data = job.data;
      const { sourceLanguage, targetLanguages } = this.resolveLanguages(data);

      switch (type) {
        case TranslationJobType.QUESTION:
          return this.processQuestion(
            data as TranslationJobDataMap[TranslationJobType.QUESTION],
            sourceLanguage,
            targetLanguages,
          );
        case TranslationJobType.ROADMAP_PHASE:
          return this.processRoadmapPhase(
            data as TranslationJobDataMap[TranslationJobType.ROADMAP_PHASE],
            sourceLanguage,
            targetLanguages,
          );
        case TranslationJobType.ROADMAP_SKILL:
          return this.processRoadmapSkill(
            data as TranslationJobDataMap[TranslationJobType.ROADMAP_SKILL],
            sourceLanguage,
            targetLanguages,
          );
        default:
          this.logger.warn(
            `[translation.worker] Unknown translation job: ${jobName}`,
          );
      }
    } catch (error) {
      this.logger.error(
        `[worker.translation.process] Failed to process translation: ${error}`,
        error.stack,
      );
      throw error;
    }
  }

  private resolveLanguages(data: TranslationPayloadBase) {
    const sourceLanguage = data.sourceLanguage || "vi";
    const targetLanguages = [...new Set(data.targetLanguages || ["en"])].filter(
      (lang) => Boolean(lang),
    );

    return { sourceLanguage, targetLanguages };
  }

  private async processQuestion(
    data: TranslationJobDataMap[TranslationJobType.QUESTION],
    sourceLanguage: string,
    targetLanguages: string[],
  ) {
    const [question] = await this.db
      .select({
        id: questions.id,
        questionText: questions.questionText,
        options: questions.options,
        correctAnswer: questions.correctAnswer,
        correctAnswerKey: questions.correctAnswerKey,
      })
      .from(questions)
      .where(
        and(eq(questions.id, data.questionId), isNull(questions.deletedAt)),
      )
      .limit(1);

    if (!question) {
      this.logger.warn(
        `[translation.worker] question not found: ${data.questionId}`,
      );
      return;
    }

    const options = question.options || [];
    const correctAnswerIndex = Number(question.correctAnswerKey);

    for (const languageCode of targetLanguages) {
      const [questionText, translatedOptions, translatedCorrectAnswer] =
        await Promise.all([
          this.translateField(
            question.questionText,
            sourceLanguage,
            languageCode,
          ),
          this.translateStringArray(options, sourceLanguage, languageCode),
          Number.isInteger(correctAnswerIndex) && correctAnswerIndex >= 0
            ? Promise.resolve("")
            : this.translateField(
                question.correctAnswer,
                sourceLanguage,
                languageCode,
              ),
        ]);
      const correctAnswer =
        Number.isInteger(correctAnswerIndex) && correctAnswerIndex >= 0
          ? (translatedOptions[correctAnswerIndex] ?? question.correctAnswer)
          : translatedCorrectAnswer;

      await this.db
        .insert(questionTranslation)
        .values({
          questionId: question.id,
          languageCode,
          questionText,
          options: translatedOptions,
          correctAnswer,
        })
        .onConflictDoUpdate({
          target: [
            questionTranslation.questionId,
            questionTranslation.languageCode,
          ],
          set: {
            questionText,
            options: translatedOptions,
            correctAnswer,
            updatedAt: sql`NOW()`,
          },
        });
    }
  }

  private async processRoadmapPhase(
    data: TranslationJobDataMap[TranslationJobType.ROADMAP_PHASE],
    sourceLanguage: string,
    targetLanguages: string[],
  ) {
    const [phase] = await this.db
      .select({
        id: roadmapPhases.id,
        name: roadmapPhases.name,
        description: roadmapPhases.description,
      })
      .from(roadmapPhases)
      .where(
        and(
          eq(roadmapPhases.id, data.phaseId),
          isNull(roadmapPhases.deletedAt),
        ),
      )
      .limit(1);

    if (!phase) {
      this.logger.warn(
        `[translation.worker] roadmap phase not found: ${data.phaseId}`,
      );
      return;
    }

    for (const languageCode of targetLanguages) {
      const [name, description] = await Promise.all([
        this.translateField(phase.name, sourceLanguage, languageCode),
        this.translateField(phase.description, sourceLanguage, languageCode),
      ]);

      await this.db
        .insert(roadmapPhaseTranslation)
        .values({
          phaseId: phase.id,
          languageCode,
          name,
          description,
        })
        .onConflictDoUpdate({
          target: [
            roadmapPhaseTranslation.phaseId,
            roadmapPhaseTranslation.languageCode,
          ],
          set: {
            name,
            description,
            updatedAt: sql`NOW()`,
          },
        });
    }
  }

  private async processRoadmapSkill(
    data: TranslationJobDataMap[TranslationJobType.ROADMAP_SKILL],
    sourceLanguage: string,
    targetLanguages: string[],
  ) {
    const [skill] = await this.db
      .select({
        id: roadmapSkills.id,
        skill: roadmapSkills.skill,
        description: roadmapSkills.description,
      })
      .from(roadmapSkills)
      .where(
        and(
          eq(roadmapSkills.id, data.skillId),
          isNull(roadmapSkills.deletedAt),
        ),
      )
      .limit(1);

    if (!skill) {
      this.logger.warn(
        `[translation.worker] roadmap skill not found: ${data.skillId}`,
      );
      return;
    }

    for (const languageCode of targetLanguages) {
      const [translatedSkill, description] = await Promise.all([
        this.translateField(skill.skill, sourceLanguage, languageCode),
        this.translateField(skill.description, sourceLanguage, languageCode),
      ]);

      await this.db
        .insert(roadmapSkillTranslation)
        .values({
          skillId: skill.id,
          languageCode,
          skill: translatedSkill,
          description,
        })
        .onConflictDoUpdate({
          target: [
            roadmapSkillTranslation.skillId,
            roadmapSkillTranslation.languageCode,
          ],
          set: {
            skill: translatedSkill,
            description,
            updatedAt: sql`NOW()`,
          },
        });
    }
  }

  private async translateField(
    value: string,
    sourceLanguage: string,
    targetLanguage: string,
  ) {
    if (sourceLanguage === targetLanguage) {
      return value;
    }

    const translated = await this.translator.translateText({
      text: value,
      sourceLanguage,
      targetLanguage,
    });

    return this.decodeHtmlEntities(translated.translatedText);
  }

  private async translateNullableField(
    value: string | null,
    sourceLanguage: string,
    targetLanguage: string,
  ) {
    if (!value) {
      return value;
    }
    return this.translateField(value, sourceLanguage, targetLanguage);
  }

  private async translateStringArray(
    values: string[],
    sourceLanguage: string,
    targetLanguage: string,
  ) {
    if (!values.length || sourceLanguage === targetLanguage) {
      return values;
    }

    const translatedValues = await Promise.all(
      values.map((value) =>
        this.translator.translateText({
          text: value,
          sourceLanguage,
          targetLanguage,
        }),
      ),
    );

    return translatedValues.map((item) =>
      this.decodeHtmlEntities(item.translatedText),
    );
  }

  private decodeHtmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"');
  }
}
