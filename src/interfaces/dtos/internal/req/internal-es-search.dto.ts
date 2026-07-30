import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsObject, IsString } from "class-validator";
import { GeneralQueryDto } from "../../common/query";

export const INTERNAL_ES_INDEX_ALIASES = [
  "jobs",
  "cvs",
  "event-tracking",
] as const;
export type InternalEsIndexAlias = (typeof INTERNAL_ES_INDEX_ALIASES)[number];

export class InternalEsSearchDto extends GeneralQueryDto {
  @ApiProperty({
    enum: INTERNAL_ES_INDEX_ALIASES,
    example: "jobs",
    description:
      "Logical index alias. Mapped to ELASTICSEARCH_INDEX_* from env.",
  })
  @IsString()
  @IsIn(INTERNAL_ES_INDEX_ALIASES)
  index: InternalEsIndexAlias;

  @ApiProperty({
    example: { id: "uuid-here", categoryId: null },
    description:
      'Field filters. Scalar → term, array → terms, null/"" → missing or empty. Combined with bool.must.',
  })
  @IsObject()
  param: Record<
    string,
    string | number | boolean | null | Array<string | number>
  >;
}
