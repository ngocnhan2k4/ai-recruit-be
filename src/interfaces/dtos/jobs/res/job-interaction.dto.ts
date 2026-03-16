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
    example: "uuid-cv-id",
    required: false,
    description: "CV ID used for application",
  })
  userCvId?: string;

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
