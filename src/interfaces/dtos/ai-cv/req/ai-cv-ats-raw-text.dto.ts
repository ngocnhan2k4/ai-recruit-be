import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn } from "class-validator";

export class GetAtsRawTextQueryDto {
  @ApiPropertyOptional({
    description: "Which version of the CV to fetch raw text for",
    enum: ["original", "optimized"],
    example: "optimized",
  })
  @IsIn(["original", "optimized"])
  version: "original" | "optimized";
}
