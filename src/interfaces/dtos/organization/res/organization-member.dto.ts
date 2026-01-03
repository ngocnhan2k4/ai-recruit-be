import { OrganizationRoleEnum } from "@/core";
import { ApiProperty } from "@nestjs/swagger";

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
