import { ApiProperty, PartialType } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsUUID, IsNumber, Min } from "class-validator";

export class CreateLevelDto {
  @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000" })
  @IsUUID()
  @IsNotEmpty()
  areaId: string;

  @ApiProperty({ example: "Beginner" })
  @IsString()
  @IsNotEmpty()
  levelName: string;

  @ApiProperty({ example: 0 })
  @IsNumber()
  @Min(0)
  minScore: number;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0)
  maxScore: number;
}

export class UpdateLevelDto extends PartialType(CreateLevelDto) {}
