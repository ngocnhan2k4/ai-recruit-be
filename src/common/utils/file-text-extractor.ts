import { PDFParse } from "pdf-parse";
import { extractRawText } from "mammoth";
import { MultipartFile } from "@fastify/multipart";
import { RESPONSE_MESSAGE } from "../constants/response";

// pdf-parse's getText() only does geometric line/column segmentation (lineThreshold,
// cellThreshold) - it has no true block/column clustering, so 2-column resumes can still
// interleave lines across columns. Full column-aware reordering would require its separate
// getTable() geometry API, which is overkill here since resumes aren't literal tables.
const PDF_PARSE_OPTIONS = { lineThreshold: 3 };

export class FileTextExtractor {
  private static sanitizeExtractedText(text: string): string {
    return text
      .replace(/\0/g, "")
      .replace(/--\s*\d+\s*of\s*\d+\s*--/gi, " ")
      .replace(/page\s+\d+\s+of\s+\d+/gi, " ")
      .replace(/[•▪◦✓➢●▶]/g, "-")
      .replace(/[–—]/g, "-")
      .replace(/[\t\u00A0]/g, " ")
      .replace(/ {2,}/g, " ")
      .split("\n")
      .map((line) => line.trim())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  static async extractFromPdf(buffer: Buffer): Promise<string> {
    try {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText(PDF_PARSE_OPTIONS);
      return result.text ? this.sanitizeExtractedText(result.text) : "";
    } catch (error: any) {
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  static async extractFromDocx(buffer: Buffer): Promise<string> {
    try {
      const result = await extractRawText({ buffer });
      return result.value.replace(/\0/g, "").trim();
    } catch (error: any) {
      throw new Error(`Failed to extract text from DOCX: ${error.message}`);
    }
  }

  // Extract text from file based on mime type
  static async extractText(file: MultipartFile): Promise<string> {
    try {
      const buffer = await this.validateFile(file);
      const mimeType = file.mimetype;
      let text = "";

      if (mimeType === "application/pdf") {
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText(PDF_PARSE_OPTIONS);
        text = this.sanitizeExtractedText(result.text ?? "");
      } else if (
        mimeType ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        mimeType === "application/msword"
      ) {
        const result = await extractRawText({ buffer });
        text = result.value.replace(/\0/g, "").trim();
      } else {
        throw new Error(RESPONSE_MESSAGE.INVALID_FILE_TYPE);
      }

      if (text.length < 100) {
        throw new Error(
          "Extracted text is too short (<100 chars). File might be an image scan.",
        );
      }

      return text;
    } catch (error: any) {
      throw new Error(`CV Processing Failed: ${error.message}`);
    }
  }

  static async validateFile(file: MultipartFile): Promise<Buffer> {
    if (!file) throw new Error("File is required");

    const buffer = await file.toBuffer();
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (buffer.length > maxSize) {
      throw new Error(RESPONSE_MESSAGE.FILE_TOO_LARGE);
    }
    return buffer;
  }
}
