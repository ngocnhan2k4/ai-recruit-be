import { 
  Controller, 
  Post, 
  Delete, 
  Param, 
  HttpStatus,
  BadRequestException,
  Req,
  Res
} from "@nestjs/common";
import type { FastifyRequest, FastifyReply } from "fastify";
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiResponse, ApiParam, ApiBearerAuth } from "@nestjs/swagger";
import { FirebaseStorageService, UploadedFile as CustomUploadedFile } from "@/frameworks/storage/firebase-storage.service";
import { UploadFileDto, UploadResultDto, DeleteFileDto } from "@/interfaces/dtos/upload.dto";
import { ApiResponse as CustomApiResponse } from "@/interfaces/dtos/common/api-response.dto";

@ApiTags("File Upload")
@Controller("upload")
export class UploadController {
  constructor(private readonly firebaseStorageService: FirebaseStorageService) {}

  @ApiOperation({
    summary: "Upload a file to Firebase Storage",
    description: "Upload any file (image, document, etc.) to Firebase Storage and get a public URL"
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File upload',
    type: UploadFileDto,
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    type: CustomApiResponse<UploadResultDto>
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid file or file too large'
  })
  @ApiBearerAuth()
  @Post()
  async uploadFile(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply
  ): Promise<void> {
    try {
      const data = await req.file();
      
      if (!data) {
        res.status(400).send({
          code: 400,
          message: "No file uploaded"
        });
        return;
      }

      // Convert Fastify multipart file to our interface
      const file: CustomUploadedFile = {
        originalname: data.filename || 'unknown',
        buffer: await data.toBuffer(),
        mimetype: data.mimetype || 'application/octet-stream',
        size: data.file?.bytesRead || 0
      };

      // Validate file
      this.firebaseStorageService.validateFile(file, {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: [
          'image/jpeg', 
          'image/jpg', 
          'image/png', 
          'image/gif',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'video/mp4',
          'video/webm'
        ]
      });

      const result = await this.firebaseStorageService.uploadFile(file, "uploads");
      
      res.status(201).send({
        message: "File uploaded successfully",
        code: 201,
        data: result,
      });
    } catch (error) {
      res.status(400).send({
        code: 400,
        message: error.message || "Failed to upload file"
      });
    }
  }

  @ApiOperation({
    summary: "Delete a file from Firebase Storage",
    description: "Delete a previously uploaded file from Firebase Storage"
  })
  @ApiParam({
    name: 'path',
    description: 'Path of the file to delete (e.g., uploads/uuid-filename.jpg)',
    example: 'uploads/uuid-filename.jpg'
  })
  @ApiResponse({
    status: 200,
    description: 'File deleted successfully'
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid path'
  })
  @ApiResponse({
    status: 404,
    description: 'File not found'
  })
  @ApiBearerAuth()
  @Delete(":path")
  async deleteFile(
    @Param("path") path: string
  ): Promise<CustomApiResponse<{ message: string }>> {
    if (!path || path.trim() === '') {
      throw new BadRequestException('File path is required');
    }

    await this.firebaseStorageService.deleteFile(path);
    
    return new CustomApiResponse<{ message: string }>({
      message: "File deleted successfully",
      code: HttpStatus.OK.toString(),
      data: { message: `File ${path} has been deleted` },
    });
  }
}
