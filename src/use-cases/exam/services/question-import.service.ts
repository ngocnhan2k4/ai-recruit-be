import { Injectable } from "@nestjs/common";
import {
  IQuestionRepository,
  ISkillRepository,
  IAreaRepository,
  IImportLogRepository,
} from "@/core";
import { ImportResultDto } from "../dto";

interface ImportRow {
  area?: string;
  areaId?: string;
  skill?: string;
  skillId?: string;
  questionText: string;
  options: string | string[];
  correctAnswer: string;
  point: number | string;
  difficulty: string;
}

@Injectable()
export class QuestionImportService {
  constructor(
    private readonly questionRepo: IQuestionRepository,
    private readonly skillRepo: ISkillRepository,
    private readonly areaRepo: IAreaRepository,
    private readonly importLogRepo: IImportLogRepository,
  ) {}

  async importFromCSV(
    fileContent: string,
    fileName: string,
  ): Promise<ImportResultDto> {
    const lines = fileContent.split("\n").filter((line) => line.trim());
    const headers = lines[0].split(",").map((h) => h.trim());

    const rows: ImportRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim();
      });
      rows.push(row);
    }

    return await this.processImport(rows, fileName);
  }

  async importFromJSON(
    data: ImportRow[],
    fileName: string,
  ): Promise<ImportResultDto> {
    return await this.processImport(data, fileName);
  }

  private async processImport(
    rows: ImportRow[],
    fileName: string,
  ): Promise<ImportResultDto> {
    const errors: string[] = [];
    const validQuestions: any[] = [];
    let successCount = 0;

    // Cache for skills and areas
    const skillCache = new Map<string, string>();
    const areaCache = new Map<string, string>();

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

        // Validate and parse point
        const point =
          typeof row.point === "number" ? row.point : parseFloat(row.point);
        if (isNaN(point) || point < 1) {
          errors.push(`Row ${rowNum}: Invalid point value`);
          continue;
        }

        // Validate difficulty
        const validDifficulties = ["easy", "medium", "hard"];
        const difficulty = row.difficulty?.toLowerCase();
        if (!validDifficulties.includes(difficulty)) {
          errors.push(
            `Row ${rowNum}: Invalid difficulty (must be easy/medium/hard)`,
          );
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

        // Resolve area ID
        let areaId = row.areaId;
        if (!areaId && row.area) {
          if (!areaCache.has(row.area)) {
            const areas = await this.areaRepo.getByField({ name: row.area });
            if (areas.length === 0) {
              errors.push(`Row ${rowNum}: Area '${row.area}' not found`);
              continue;
            }
            areaCache.set(row.area, areas[0].id);
          }
          areaId = areaCache.get(row.area);
        }

        if (!areaId) {
          errors.push(`Row ${rowNum}: Missing areaId or area name`);
          continue;
        }

        validQuestions.push({
          skillId,
          areaId,
          questionText: row.questionText,
          options,
          correctAnswer: row.correctAnswer,
          point,
          difficulty,
          isActive: true,
        });
        successCount++;
      } catch (error) {
        errors.push(`Row ${rowNum}: ${error.message}`);
      }
    }

    // Bulk insert valid questions
    if (validQuestions.length > 0) {
      await this.questionRepo.createMany(validQuestions);
    }

    // Save import log
    await this.importLogRepo.create({
      fileName,
      totalRows: rows.length,
      successRows: successCount,
      failedRows: rows.length - successCount,
    });

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
