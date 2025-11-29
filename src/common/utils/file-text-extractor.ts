import { PDFParse } from "pdf-parse";
import { extractRawText } from "mammoth";

export class FileTextExtractor {
  static async extractFromPdf(buffer: Buffer): Promise<string> {
    try {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      return result.text ? result.text.trim() : "";
    } catch (error: any) {
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  static async extractFromDocx(buffer: Buffer): Promise<string> {
    try {
      const result = await extractRawText({ buffer });
      return result.value.trim();
    } catch (error: any) {
      throw new Error(`Failed to extract text from DOCX: ${error.message}`);
    }
  }

  /**
   * Extract text from file based on mime type
   */
  static async extractText(buffer: Buffer, mimeType: string): Promise<string> {
    switch (mimeType) {
      case "application/pdf":
        return this.extractFromPdf(buffer);

      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      case "application/msword":
        return this.extractFromDocx(buffer);

      default:
        throw new Error(
          `Unsupported file type: ${mimeType}. Only PDF and DOCX are supported.`,
        );
    }
  }

  static validateText(text: string, minLength: number = 100): void {
    if (!text || text.length < minLength) {
      throw new Error(
        `Extracted text is too short (${text.length} chars). Minimum required: ${minLength} chars.`,
      );
    }
  }
}
