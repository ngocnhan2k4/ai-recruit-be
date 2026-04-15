import { ApiProperty } from "@nestjs/swagger";
import {
  IsUUID,
  IsOptional,
  IsArray,
  IsEnum,
  IsString,
  IsInt,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApplyStatusEnum } from "@/core";

export class JobAnswerDto {
  @ApiProperty({
    example: "What is your experience with React?",
    description: "The question text",
  })
  @IsString()
  question: string;

  @ApiProperty({
    example:
      "I have 3 years of experience with React and have built several production applications.",
    description: "The answer to the question",
  })
  @IsString()
  answer: string;
}

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
  cvId?: string;

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
      {
        question: "How do you handle state management?",
        answer:
          "I use Redux for complex state management and React hooks for local state.",
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JobAnswerDto)
  answers?: JobAnswerDto[];
}

export class SaveJobDto {
  @ApiProperty({
    example: "uuid-job-id",
    description: "Job ID to save",
  })
  @IsUUID()
  jobId: string;

  // @ApiProperty({
  //   example: true,
  //   required: false,
  //   description:
  //     "Whether to save (true) or unsave (false) the job. Defaults to true.",
  // })
  // @IsOptional()
  // @IsBoolean()
  // @Transform(({ value }) => {
  //   if (value === undefined) return true;
  //   return value as boolean;
  // })
  // save?: boolean;
}

// export class HideJobDto {
//   @ApiProperty({
//     example: "uuid-job-id",
//     description: "Job ID to hide",
//   })
//   @IsUUID()
//   jobId: string;

//   @ApiProperty({
//     example: true,
//     required: false,
//     description:
//       "Whether to hide (true) or unhide (false) the job. Defaults to true.",
//   })
//   @IsOptional()
//   @IsBoolean()
//   @Transform(({ value }) => {
//     if (value === undefined) return true;
//     return value as boolean;
//   })
//   hide?: boolean;
// }

export class ApplyJobQueryDto {
  @ApiProperty({
    example: "uuid-apply-id",
    description: "Job ID",
  })
  @IsUUID()
  jobId: string;

  @ApiProperty({
    example: 10,
    description: "Number of applications to return",
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiProperty({
    example: "1743739200000",
    description: "Cursor from previous response (createdAt timestamp)",
    required: false,
  })
  @IsOptional()
  @IsString()
  cursor?: string;
}

export class UpdateApplyJobDto {
  @ApiProperty({
    example: "pending",
    description: "New application status",
    enum: ApplyStatusEnum,
    required: false,
  })
  @IsOptional()
  @IsEnum(ApplyStatusEnum)
  status?: ApplyStatusEnum;

  @ApiProperty({
    example: "uuid-cv-id",
    required: false,
    description:
      "CV ID to use for application (can only be changed when status is 'applied')",
  })
  @IsOptional()
  @IsUUID()
  cvId?: string;

  @ApiProperty({
    type: [JobAnswerDto],
    required: false,
    description: "Updated answers to job questions",
    example: [
      {
        question: "What is your experience with React?",
        answer:
          "Updated: I have 5 years of experience with React and have built many production applications.",
      },
      {
        question: "How do you handle state management?",
        answer:
          "Updated: I use Redux Toolkit for complex state management and React hooks for local state.",
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JobAnswerDto)
  answers?: JobAnswerDto[];
}
