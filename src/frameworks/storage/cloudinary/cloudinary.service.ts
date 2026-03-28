import { BadRequestException, Injectable } from "@nestjs/common";
import { v2 as cloudinary } from "cloudinary";

import { ConfigService } from "@nestjs/config";
import { MultipartFile } from "@fastify/multipart";

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get("CLOUDINARY_CLOUD_NAME"),
      api_key: this.configService.get("CLOUDINARY_API_KEY"),
      api_secret: this.configService.get("CLOUDINARY_API_SECRET"),
    });
  }

  async uploadFile(
    file: MultipartFile,
    options?: {
      folder?: string;
    },
  ): Promise<any> {
    const buffer = await file.toBuffer(); // FastifyMultipart hỗ trợ toBuffer()

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "auto",
          folder: options?.folder
            ? `${this.configService.get<string>("NODE_ENV")}/${options?.folder}`
            : "default",
        },
        (error, result) => {
          if (error) reject(new Error(error.message));
          else resolve(result);
        },
      );

      uploadStream.end(buffer);
    });
  }
  async deleteFile(public_id: string): Promise<any> {
    const result = await cloudinary.uploader.destroy(public_id);
    return result;
  }

  // Validate file type and size
  async validateFile(
    file: MultipartFile,
    options: {
      maxSize?: number; // in bytes
      allowedTypes?: string[];
    } = {},
  ): Promise<void> {
    const { maxSize = 10 * 1024 * 1024, allowedTypes = [] } = options; // 10MB default

    // Lấy buffer để check size
    const buffer = await file.toBuffer();

    if (buffer.length > maxSize) {
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
