import { Injectable } from "@nestjs/common";
import { IQuestionRepository, ISkillRepository, Question } from "@/core";
import { ImportResultDto } from "@/interfaces/dtos/exam";
import {
  TranslationJobType,
  TRANSLATION_SUPPORTED_LANGUAGES,
} from "@/common/constants";
import { IMessageQueueService } from "@/core/abstracts/message-queue.abstract";
import { normalizeLanguageCode } from "@/common/utils";

export interface ImportRow {
  skill?: string;
  skillId?: string;
  questionText: string;
  options: string | string[];
  correctAnswer: string;
  difficultyLevels: string | string[];
}

@Injectable()
export class QuestionImportService {
  constructor(
    private readonly questionRepo: IQuestionRepository,
    private readonly skillRepo: ISkillRepository,
    private readonly messageQueueService: IMessageQueueService,
  ) {}

  async importFromCSV(
    fileContent: string,
    requestLanguage?: string,
  ): Promise<ImportResultDto> {
    const lines = fileContent.split("\n").filter((line) => line.trim());
    const headers = lines[0].split(",").map((h) => h.trim());

    const rows: ImportRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const row: Partial<ImportRow> & Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim();
      });
      rows.push(row as ImportRow);
    }

    return await this.processImport(rows, requestLanguage);
  }

  async importFromJSON(
    data: ImportRow[],
    requestLanguage?: string,
  ): Promise<ImportResultDto> {
    return await this.processImport(data, requestLanguage);
  }

  private async processImport(
    rows: ImportRow[],
    requestLanguage?: string,
  ): Promise<ImportResultDto> {
    const errors: string[] = [];
    const validQuestions: Partial<Question>[] = [];
    let successCount = 0;

    // Cache for skills
    const skillCache = new Map<string, string>();

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2; // +2 because of 0-index and header
      const row = rows[i];

      try {
        // Validate required fields
        if (!row.questionText) {
          errors.push(`Row ${rowNum}: Missing questionText`);
          continue;
        }

        if (!row.correctAnswer) {
          errors.push(`Row ${rowNum}: Missing correctAnswer`);
          continue;
        }

        // Parse options
        let options: string[];
        if (typeof row.options === "string") {
          try {
            // Try parsing as JSON array
            options = JSON.parse(row.options);
          } catch {
            // Split by delimiter (pipe or semicolon)
            options = row.options
              .split(/[|;]/)
              .map((opt) => opt.trim())
              .filter((opt) => opt);
          }
        } else {
          options = row.options;
        }

        if (!options || options.length < 2) {
          errors.push(`Row ${rowNum}: Options must have at least 2 items`);
          continue;
        }

        // Validate correctAnswer is in options
        if (!options.includes(row.correctAnswer)) {
          errors.push(`Row ${rowNum}: correctAnswer not found in options`);
          continue;
        }
        const correctAnswerIndex = options.findIndex(
          (option) => option === row.correctAnswer,
        );
        if (correctAnswerIndex < 0) {
          errors.push(`Row ${rowNum}: unable to determine correct answer key`);
          continue;
        }

        const optionKeys = options.map((_, index) => String(index));

        // Parse and validate difficultyLevels
        let difficultyLevels: string[];
        if (typeof row.difficultyLevels === "string") {
          try {
            difficultyLevels = JSON.parse(row.difficultyLevels);
          } catch {
            difficultyLevels = row.difficultyLevels
              .split(/[,;|]/)
              .map((d) => d.trim().toLowerCase());
          }
        } else if (Array.isArray(row.difficultyLevels)) {
          difficultyLevels = row.difficultyLevels.map((d) => d.toLowerCase());
        } else {
          errors.push(`Row ${rowNum}: Missing difficultyLevels`);
          continue;
        }

        const validDifficulties = [
          "easy",
          "medium",
          "hard",
          "advanced",
          "expert",
        ] as const;
        const invalidLevels = difficultyLevels.filter(
          (d) =>
            !validDifficulties.includes(
              d as (typeof validDifficulties)[number],
            ),
        );
        if (invalidLevels.length > 0) {
          errors.push(
            `Row ${rowNum}: Invalid difficulty levels: ${invalidLevels.join(", ")}`,
          );
          continue;
        }

        if (difficultyLevels.length < 1 || difficultyLevels.length > 3) {
          errors.push(`Row ${rowNum}: Must have 1-3 difficulty levels`);
          continue;
        }

        // Resolve skill ID
        let skillId = row.skillId;
        if (!skillId && row.skill) {
          if (!skillCache.has(row.skill)) {
            const skills = await this.skillRepo.getByField({ name: row.skill });
            if (skills.length === 0) {
              errors.push(`Row ${rowNum}: Skill '${row.skill}' not found`);
              continue;
            }
            skillCache.set(row.skill, skills[0].id);
          }
          skillId = skillCache.get(row.skill);
        }

        if (!skillId) {
          errors.push(`Row ${rowNum}: Missing skillId or skill name`);
          continue;
        }

        validQuestions.push({
          skillId,
          questionText: row.questionText,
          options,
          correctAnswer: row.correctAnswer,
          optionKeys,
          correctAnswerKey: String(correctAnswerIndex),
          difficultyLevels: difficultyLevels as (
            | "easy"
            | "medium"
            | "hard"
            | "advanced"
            | "expert"
          )[],
          isActive: true,
        });
        successCount++;
      } catch (error) {
        errors.push(`Row ${rowNum}: ${error.message}`);
      }
    }

    // Bulk insert valid questions
    if (validQuestions.length > 0) {
      const sourceLanguage = normalizeLanguageCode(requestLanguage);
      const targetLanguages = TRANSLATION_SUPPORTED_LANGUAGES.filter(
        (language) => language !== sourceLanguage,
      );
      const createdQuestions =
        await this.questionRepo.createMany(validQuestions);
      if (targetLanguages.length) {
        await Promise.all(
          createdQuestions.map((question) =>
            this.messageQueueService.addTranslation(
              TranslationJobType.QUESTION,
              {
                questionId: question.id,
                sourceLanguage,
                targetLanguages,
              },
            ),
          ),
        );
      }
    }

    return {
      totalRows: rows.length,
      successRows: successCount,
      failedRows: rows.length - successCount,
      errors,
    };
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }
}
