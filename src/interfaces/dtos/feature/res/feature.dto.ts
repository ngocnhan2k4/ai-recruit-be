import { FeatureCodeEnum } from "@/core";
import { ApiProperty } from "@nestjs/swagger";

export class FeatureDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ enum: FeatureCodeEnum, example: FeatureCodeEnum.CV })
  code: FeatureCodeEnum;

  @ApiProperty({ example: "CV" })
  name: string;

  @ApiProperty({ required: false, nullable: true })
  description: string | null;
}
