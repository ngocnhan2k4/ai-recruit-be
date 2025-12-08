import { PDFParse } from "pdf-parse";
import { extractRawText } from "mammoth";
import { MultipartFile } from "@fastify/multipart";
import { RESPONSE_MESSAGE } from "../constants/response";

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

  // Extract text from file based on mime type
  static async extractText(file: MultipartFile): Promise<string> {
    try {
      const buffer = await this.validateFile(file);
      const mimeType = file.mimetype;
      let text = "";

      if (mimeType === "application/pdf") {
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        text = result.text;
      } else if (
        mimeType ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        mimeType === "application/msword"
      ) {
        const result = await extractRawText({ buffer });
        text = result.value;
      } else {
        throw new Error(RESPONSE_MESSAGE.INVALID_FILE_TYPE);
      }

      text = text.trim();

      if (text.length < 100) {
        throw new Error(
          "Extracted text is too short (<100 chars). File might be an image scan.",
        );
      }

      return text;
    } catch (error) {
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
