import { ApiProperty } from "@nestjs/swagger";
import { IsUUID, IsOptional, IsObject, IsBoolean } from "class-validator";

export class ApplyJobDto {
  @ApiProperty({
    example: "uuid-job-id",
    description: "Job ID to apply for",
  })
  @IsUUID()
  jobId: string;

  @ApiProperty({
    example: "uuid-cv-id",
    required: false,
    description: "CV ID to use for application",
  })
  @IsOptional()
  @IsUUID()
  userCvId?: string;

  @ApiProperty({
    example: { question1: "answer1", question2: "answer2" },
    required: false,
    description: "Answers to job questions",
  })
  @IsOptional()
  @IsObject()
  answers?: Record<string, any>;
}

export class SaveJobDto {
  @ApiProperty({
    example: "uuid-job-id",
    description: "Job ID to save",
  })
  @IsUUID()
  jobId: string;

  @ApiProperty({
    example: true,
    required: false,
    description:
      "Whether to save (true) or unsave (false) the job. Defaults to true.",
  })
  @IsOptional()
  @IsBoolean()
  save?: boolean;
}

export class HideJobDto {
  @ApiProperty({
    example: "uuid-job-id",
    description: "Job ID to hide",
  })
  @IsUUID()
  jobId: string;

  @ApiProperty({
    example: true,
    required: false,
    description:
      "Whether to hide (true) or unhide (false) the job. Defaults to true.",
  })
  @IsOptional()
  @IsBoolean()
  hide?: boolean;
}

export class ApplyJobResponseDto {
  @ApiProperty({
    example: "uuid-apply-id",
    description: "Application ID",
  })
  id: string;

  @ApiProperty({
    example: "uuid-user-id",
    description: "User ID",
  })
  userId: string;

  @ApiProperty({
    example: "uuid-job-id",
    description: "Job ID",
  })
  jobId: string;

  @ApiProperty({
    example: "pending",
    description: "Application status",
  })
  status: string;

  @ApiProperty({
    example: "uuid-cv-id",
    required: false,
    description: "CV ID used for application",
  })
  userCvId?: string;

  @ApiProperty({
    example: { question1: "answer1" },
    required: false,
    description: "Answers to job questions",
  })
  answers?: Record<string, any>;

  @ApiProperty({
    description: "Created at timestamp",
  })
  createdAt: Date;

  @ApiProperty({
    description: "Updated at timestamp",
  })
  updatedAt: Date;
}

export class UserInteractionResponseDto {
  @ApiProperty({
    example: "uuid-interaction-id",
    description: "Interaction ID",
  })
  id: string;

  @ApiProperty({
    example: "uuid-user-id",
    description: "User ID",
  })
  userId: string;

  @ApiProperty({
    example: "uuid-job-id",
    description: "Job ID",
  })
  jobId: string;

  @ApiProperty({
    example: "save",
    description: "Interaction type (save or hide)",
  })
  type: string;

  @ApiProperty({
    description: "Created at timestamp",
  })
  createdAt: Date;

  @ApiProperty({
    description: "Updated at timestamp",
  })
  updatedAt: Date;
}
