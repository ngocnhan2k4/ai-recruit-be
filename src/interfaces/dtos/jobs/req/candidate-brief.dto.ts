import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";
import type { CandidateBriefLocale } from "@/core";

export class GenerateCandidateBriefDto {
  @ApiProperty({ enum: ["vi", "en"], default: "vi" })
  @IsIn(["vi", "en"])
  locale: CandidateBriefLocale;
}
