import { ApiProperty } from "@nestjs/swagger";
import { GeneralQueryDto } from "../common/query";
import { IsArray, IsEnum, IsOptional } from "class-validator";
import { OrganizationTypeEnum } from "@/core";

export class GetOrganizationQueryDto extends GeneralQueryDto {
  @ApiProperty({ enum: OrganizationTypeEnum, required: false })
  @IsOptional()
  @IsEnum(OrganizationTypeEnum, {
    message: "Type must be a valid organization type",
  })
  type?: OrganizationTypeEnum;

  @ApiProperty({ type: "boolean", required: false })
  @IsOptional()
  verified?: boolean;

  @ApiProperty({ type: "array", items: { type: "string" }, required: false })
  @IsOptional()
  @IsArray()
  provinceIds?: string[];
}
