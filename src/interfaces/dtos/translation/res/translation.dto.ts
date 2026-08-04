import { ApiProperty } from "@nestjs/swagger";

export class TranslateContentResponseDto {
  @ApiProperty()
  entityType: string;

  @ApiProperty()
  entityId: string;

  @ApiProperty()
  field: string;

  @ApiProperty()
  sourceLanguage: string;

  @ApiProperty()
  targetLanguage: string;

  @ApiProperty()
  translatedText: string;

  @ApiProperty()
  fromCache: boolean;
}
