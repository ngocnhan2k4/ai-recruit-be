import { ApiProperty } from "@nestjs/swagger";
import { ArrayMinSize, IsArray, IsIn, IsString } from "class-validator";
import {
  INTERNAL_ES_INDEX_ALIASES,
  type InternalEsIndexAlias,
} from "./internal-es-search.dto";

export class InternalEsDeleteDto {
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
    type: [String],
    example: ["uuid-1", "uuid-2"],
    description: "Document IDs (_id) to delete from the index.",
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  ids: string[];
}
