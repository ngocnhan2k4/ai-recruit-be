import { ApiProperty } from "@nestjs/swagger";
import { JobAnswerDto } from "../req/job-interaction.dto";

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
  status: string;

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
    description: "The user who applied for the job",
    required: false,
  })
  user?: {
    id: string;
    email: string | null;
    name: string;
    avatarUrl: string | null;
  };

  @ApiProperty({
    description: "The CV used for application",
    required: false,
  })
  cv?: {
    id: string;
    name: string;
    fileUrl: string | null;
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
