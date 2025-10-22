import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional, IsNumber, IsDate } from "class-validator";
import { Transform } from "class-transformer";

export class CvRequestDto {
  @ApiProperty({
    example: "My Software Engineer CV.pdf",
    required: false,
    description: "Original filename of the CV file",
  })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiProperty({
    example: "My Software Engineer CV",
    required: false,
    description: "Name of the CV",
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: "application/pdf",
    required: false,
    description: "MIME type of the CV file",
  })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiProperty({
    example: 1024000,
    required: false,
    description: "File size in bytes",
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  fileSize?: number;
}

export class CvDto {
  @ApiProperty({
    example: "uuid-cv-id",
    description: "CV ID",
  })
  id: string;

  @ApiProperty({
    example: "My Software Engineer CV",
    description: "Name of the CV",
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: "uuid-user-id",
    description: "User ID",
  })
  userId: string;

  @ApiProperty({
    example: "https://example.com/cv.pdf",
    description: "URL of the CV file",
  })
  fileUrl: string;

  @ApiProperty({
    example: "My Software Engineer CV.pdf",
    description: "Original filename of the CV file",
  })
  fileName: string;

  @ApiProperty({
    example: "application/pdf",
    description: "MIME type of the CV file",
  })
  mimeType: string;

  @ApiProperty({
    description: "Last used timestamp",
  })
  lastUsed: Date;

  @ApiProperty({
    description: "Created at timestamp",
  })
  @IsDate()
  createdAt: Date;

  @ApiProperty({
    description: "Updated at timestamp",
    required: false,
  })
  updatedAt: Date | null;
}

export class CvListResponseDto {
  @ApiProperty({
    type: [CvDto],
    description: "Array of user CVs",
  })
  cvs: CvDto[];
}
