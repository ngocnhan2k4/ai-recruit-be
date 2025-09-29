import { BadRequestException, Injectable } from "@nestjs/common";
import { v2 as cloudinary } from "cloudinary";

import { ConfigService } from "@nestjs/config";

@Injectable()
export class CloudinaryService {
    constructor(private readonly configService: ConfigService) {
        cloudinary.config({
            cloud_name: this.configService.get("CLOUDINARY_CLOUD_NAME"),
            api_key: this.configService.get("CLOUDINARY_API_KEY"),
            api_secret: this.configService.get("CLOUDINARY_API_SECRET"),
        });
    }

    async uploadFile(file: Express.Multer.File): Promise<any> {
        if (file.buffer) {
            // Upload from buffer
            return new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    { resource_type: "auto" },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                ).end(file.buffer);
            });
        } else {
            // Upload from file path
            return cloudinary.uploader.upload(file.path, {
                resource_type: "auto",
            });
        }
    }

    async deleteFile(public_id: string) {
        const result = await cloudinary.uploader.destroy(public_id);
        return result;
    }

    // Validate file type and size
    validateFile(
        file: Express.Multer.File,
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