import { ApiProperty } from "@nestjs/swagger";
import { UserDto } from "../../users";

export class JobCandidateRecommendationDto {
  @ApiProperty({ example: "cv-id" })
  cvId: string;

  @ApiProperty({ example: "user-id" })
  userId: string;

  @ApiProperty({ example: "Senior Backend CV" })
  name: string;

  @ApiProperty({ example: "https://cdn.example.com/cv.pdf" })
  fileUrl: string;

  @ApiProperty({ example: "application/pdf" })
  mimeType: string;

  @ApiProperty({ example: 82.5 })
  score: number;

  @ApiProperty({
    description: "Detailed matching breakdown for FE explainability",
    type: Object,
  })
  criteria: Record<string, any>;

  @ApiProperty({
    description: "The user who the CV belongs to",
  })
  user: Pick<UserDto, "id" | "email" | "name" | "avatarUrl" | "username">;
}
