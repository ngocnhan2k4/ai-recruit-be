import { OrganizationRoleEnum } from "@/core";
import { ApiProperty } from "@nestjs/swagger";
import { GeneralQueryDto } from "../common/query";
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

export class OrganizationMemberDto {
  @ApiProperty({ type: "string", format: "uuid" })
  id: string;

  @ApiProperty({ type: "string" })
  name: string;

  @ApiProperty({ type: "string" })
  email: string | null;

  @ApiProperty({ type: "string" })
  avatarUrl: string | null;

  @ApiProperty({ enum: OrganizationRoleEnum })
  role: OrganizationRoleEnum;
}
