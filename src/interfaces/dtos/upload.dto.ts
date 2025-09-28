import { ApiProperty } from "@nestjs/swagger";

export class UploadFileDto {
  @ApiProperty({
    type: "string",
    format: "binary",
    description: "File to upload",
  })
  file: any;
}

export class UploadResultDto {
  @ApiProperty({
    description: "Public URL of the uploaded file",
    example:
      "https://storage.googleapis.com/bucket-name/uploads/uuid-filename.jpg",
  })
  fileUrl: string;

  @ApiProperty({
    description: "Original filename with unique identifier",
    example: "uuid-filename.jpg",
  })
  fileName: string;

  @ApiProperty({
    description: "Firebase Storage bucket name",
    example: "your-project-id.appspot.com",
  })
  bucket: string;

  @ApiProperty({
    description: "File size in bytes",
    example: 1024000,
  })
  size: number;

  @ApiProperty({
    description: "MIME type of the file",
    example: "image/jpeg",
  })
  contentType: string;
}

export class DeleteFileDto {
  @ApiProperty({
    description: "Path of the file to delete",
    example: "uploads/uuid-filename.jpg",
  })
  path: string;
}
