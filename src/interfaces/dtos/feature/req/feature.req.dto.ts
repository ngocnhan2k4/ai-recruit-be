import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";

export class CreateFeatureRequestDto {
  @ApiProperty({ enum: ["cv", "learning_path"], example: "cv" })
  @IsEnum(["cv", "learning_path"] as const)
  code: "cv" | "learning_path";

  @ApiProperty({ example: "CV" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: "Create/optimize CV" })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateFeatureRequestDto {
  @ApiPropertyOptional({ example: "CV" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: "Create/optimize CV" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
