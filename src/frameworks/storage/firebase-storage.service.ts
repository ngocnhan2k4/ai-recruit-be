/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Injectable,
  BadRequestException,
  Logger,
  OnModuleInit,
} from "@nestjs/common";
import * as admin from "firebase-admin";
import { v4 as uuidv4 } from "uuid";
import * as path from "path";

export interface UploadedFile {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
  size: number;
}

export interface UploadResult {
  fileUrl: string;
  fileName: string;
  bucket: string;
  size: number;
  contentType: string;
}

@Injectable()
export class FirebaseStorageService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseStorageService.name);
  private bucket: any;

  constructor() {}

  onModuleInit() {
    // Initialize Firebase app if not already initialized
    if (admin.apps.length === 0) {
      throw new Error(
        "Firebase app not initialized. Make sure FireBaseAuthServicesModule is imported.",
      );
    }
    this.bucket = admin
      .app()
      .storage()
      .bucket(
        process.env.FIREBASE_STORAGE_BUCKET ||
          `${process.env.FIREBASE_PROJECT_ID}.appspot.com`,
      );
    this.logger.log("Firebase Storage service initialized");
  }

  async uploadFile(
    file: UploadedFile,
    folder: string = "uploads",
    customFileName?: string,
  ): Promise<UploadResult> {
    try {
      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const fileName = customFileName
        ? `${customFileName}${fileExtension}`
        : `${uuidv4()}${fileExtension}`;

      const filePath = `${folder}/${fileName}`;

      // Create file in Firebase Storage
      const fileRef = this.bucket.file(filePath);

      // Upload buffer
      await fileRef.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
          cacheControl: "public, max-age=31536000",
        },
        resumable: false,
      });
      await fileRef.makePublic();

      const fileUrl = `https://storage.googleapis.com/${this.bucket.name}/${filePath}`;

      this.logger.log(`File uploaded successfully: ${filePath}`);

      return {
        fileUrl: fileUrl,
        fileName: fileName,
        bucket: this.bucket.name,
        size: file.size,
        contentType: file.mimetype,
      };
    } catch (error) {
      this.logger.error("Error uploading file to Firebase Storage:", error);
      throw new BadRequestException("Failed to upload file");
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      const file = this.bucket.file(filePath);
      await file.delete();
      this.logger.log(`File deleted successfully: ${filePath}`);
    } catch (error) {
      this.logger.error("Error deleting file from Firebase Storage:", error);
      throw new BadRequestException("Failed to delete file");
    }
  }

  async getFileUrl(filePath: string): Promise<string> {
    try {
      const file = this.bucket.file(filePath);
      const [url] = await file.getSignedUrl({
        action: "read",
        expires: "03-09-2491",
      });
      return url;
    } catch (error) {
      this.logger.error("Error getting file URL from Firebase Storage:", error);
      throw new BadRequestException("Failed to get file URL");
    }
  }

  // Validate file type and size
  validateFile(
    file: UploadedFile,
    options: {
      maxSize?: number; // in bytes
      allowedTypes?: string[];
    } = {},
  ): void {
    const { maxSize = 10 * 1024 * 1024, allowedTypes = [] } = options; // 10MB default

    if (file.size > maxSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`,
      );
    }

    if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(", ")}`,
      );
    }
  }
}
