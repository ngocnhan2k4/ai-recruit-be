import { ApiProperty } from "@nestjs/swagger";
import { JobAnswerDto } from "../req/job-interaction.dto";
import { ApplyStatusEnum } from "@/core";

export class ApplyJobResponseDto {
  @ApiProperty({
    example: "uuid-apply-id",
    description: "Application ID",
  })
  id: string;

  @ApiProperty({
    example: "uuid-job-id",
    description: "Job ID",
  })
  jobId: string;

  @ApiProperty({
    example: "pending",
    description: "Application status",
  })
  status: ApplyStatusEnum;

  @ApiProperty({
    type: [JobAnswerDto],
    required: false,
    description: "Answers to job questions",
    example: [
      {
        question: "What is your experience with React?",
        answer:
          "I have 3 years of experience with React and have built several production applications.",
      },
    ],
  })
  answers?: JobAnswerDto[];

  @ApiProperty({
    description: "The date when the application was created",
    type: Date,
  })
  createdAt?: Date;

  @ApiProperty({
    description: "The date when the application was last updated",
    type: Date,
  })
  updatedAt?: Date;

  @ApiProperty({
    description: "Matching score between the CV and job",
    required: false,
    nullable: true,
    example: 82.5,
  })
  matchingScore?: number | string | null;

  @ApiProperty({
    description: "Breakdown of why the CV matches the job",
    required: false,
    nullable: true,
    type: Object,
  })
  matchingCriteria?: Record<string, any> | null;

  @ApiProperty({
    description: "The date when the application was last scored",
    required: false,
    nullable: true,
    type: Date,
  })
  scoredAt?: Date | null;

  @ApiProperty({
    description: "The user who applied for the job",
    required: false,
  })
  user?: {
    id: string;
    email: string | null;
    name: string;
    avatarUrl: string | null;
    username: string | null;
  };

  @ApiProperty({
    description: "The CV used for application",
    required: false,
  })
  cv?: {
    id: string;
    name: string;
    fileUrl: string | null;
    mimeType: string | null;
  };
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
    description: "Interaction type",
  })
  type: string;
}
