import { ApiProperty } from "@nestjs/swagger";

export class UploadResponseDto {
  @ApiProperty({
    description: "Public URL of the uploaded file",
    example:
      "https://storage.googleapis.com/bucket-name/uploads/uuid-filename.jpg",
  })
  url: string;

  @ApiProperty({
    description: "Original filename with unique identifier",
    example: "uuid-filename.jpg",
  })
  public_id: string;

  @ApiProperty({
    description: "Firebase Storage bucket name",
    example: "your-project-id.appspot.com",
  })
  format: string;
}

export class DeleteFileResponseDto {
  @ApiProperty({
    description: "Result message",
    example: "File deleted successfully",
  })
  message: string;
}
