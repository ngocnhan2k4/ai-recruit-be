import { Injectable } from "@nestjs/common";
import { CloudinaryService } from "@/frameworks/storage/cloudinary/cloudinary.service";
import { ApiResponse } from "@/interfaces/dtos";
import { RESPONSE_MESSAGE } from "@/common/constants/response";

@Injectable()
export class StorageUseCase {
    constructor(private readonly cloudinaryService: CloudinaryService) { }

    async uploadFile(file: Express.Multer.File): Promise<ApiResponse<{ url: string, public_id: string, format: string }>> {
        const result = await this.cloudinaryService.uploadFile(file);
        return {
            message: "File uploaded successfully",
            code: RESPONSE_MESSAGE.SUCCESS,
            data: {
                url: result.secure_url,
                public_id: result.public_id,
                format: result.format
            },
        };
    }

    async deleteFile(public_id: string): Promise<ApiResponse<{ message: string }>> {
        const result = await this.cloudinaryService.deleteFile(public_id);
        return {
            message: "File deleted successfully",
            code: RESPONSE_MESSAGE.SUCCESS,
            data: result,
        };
    }
}