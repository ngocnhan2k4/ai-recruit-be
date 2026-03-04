import { OrganizationRoleEnum } from "@/core";
import { ApiProperty } from "@nestjs/swagger";
import { GeneralQueryDto } from "../../common/query";
import { IsEnum, IsOptional } from "class-validator";

export class UpdateMemberRoleDto {
  @ApiProperty({ type: "string", format: "uuid" })
  userId: string;

  @ApiProperty({ enum: OrganizationRoleEnum, required: false })
  role: OrganizationRoleEnum;
}

export class GetMemberQueryDto extends GeneralQueryDto {
  @ApiProperty({ enum: OrganizationRoleEnum, required: false })
  @IsOptional()
  @IsEnum(OrganizationRoleEnum)
  role?: OrganizationRoleEnum;
}
