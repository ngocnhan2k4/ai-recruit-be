import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator";

export enum LazyTranslationEntityType {
  COMMENT = "comment",
  FEEDBACK = "feedback",
}

export class TranslateContentRequestDto {
  @ApiProperty({ enum: LazyTranslationEntityType })
  @IsEnum(LazyTranslationEntityType)
  entityType: LazyTranslationEntityType;

  @ApiProperty({
    description: "Record id of the entity",
    format: "uuid",
  })
  @IsUUID("4")
  entityId: string;

  @ApiProperty({
    description: "Field name to translate (e.g. content, subject, message)",
    example: "content",
  })
  @IsString()
  field: string;

  @ApiPropertyOptional({
    description:
      "Target language code. If omitted, inferred from Accept-Language.",
    example: "en",
  })
  @IsOptional()
  @IsString()
  targetLanguage?: string;
}
