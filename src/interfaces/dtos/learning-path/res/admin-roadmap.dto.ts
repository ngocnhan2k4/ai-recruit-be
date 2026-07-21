import { ApiProperty } from "@nestjs/swagger";
import { LearningRoadmapGenerationStatusEnum } from "@/core/entities/enum.entity";

export class AdminLearningRoadmapUserDto {
  @ApiProperty({ type: "string" })
  id: string;

  @ApiProperty({ type: "string", nullable: true })
  name: string | null;

  @ApiProperty({ type: "string", nullable: true })
  email?: string | null;
}

export class AdminLearningRoadmapDto {
  @ApiProperty({ type: "string" })
  id: string;

  @ApiProperty({ type: "string" })
  title: string;

  @ApiProperty({ type: "string", nullable: true })
  currentRole: string | null;

  @ApiProperty({ type: "string" })
  targetRole: string;

  @ApiProperty({ enum: LearningRoadmapGenerationStatusEnum })
  generationStatus: LearningRoadmapGenerationStatusEnum;

  @ApiProperty({ type: "string" })
  userId: string;

  @ApiProperty({
    type: "object",
    nullable: true,
    additionalProperties: true,
    description: "Generation metadata (input/result/error)",
  })
  metadata: {
    input?: unknown;
    result?: unknown;
    error?: string | null;
  } | null;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date, nullable: true })
  updatedAt: Date | null;
}

export class GetAdminLearningRoadmapsResponseDto extends AdminLearningRoadmapDto {
  @ApiProperty({ type: AdminLearningRoadmapUserDto, nullable: true })
  user?: AdminLearningRoadmapUserDto | null;
}
