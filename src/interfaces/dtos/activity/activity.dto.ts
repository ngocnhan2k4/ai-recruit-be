import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsISO8601, IsOptional, IsString } from "class-validator";
import { AuditMarkDto } from "./history-log.dto";
import { GeneralQueryDto } from "../common";
import { ObjectType } from "@/core";

export class AdminAuditQueryDto extends GeneralQueryDto {
  @ApiPropertyOptional({
    enum: ObjectType,
    description: "BLOG | ORG | JOB | USER",
  })
  @IsOptional()
  @IsEnum(ObjectType)
  targetType?: ObjectType;

  @ApiPropertyOptional({
    example: "PUT /organizations/abc/jobs/xyz",
    description: "Exact action = METHOD + url",
  })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: "Actor user id (createdBy)" })
  @IsOptional()
  @IsString()
  createdBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetId?: string;

  @ApiPropertyOptional({ description: "ISO date from" })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: "ISO date to" })
  @IsOptional()
  @IsISO8601()
  to?: string;
}

export class AdminAuditItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  createdBy: string;

  @ApiPropertyOptional({ nullable: true })
  organizationId: string | null;

  @ApiProperty({
    example: "PUT /organizations/abc/jobs/xyz",
    description: "METHOD + url",
  })
  action: string;

  @ApiProperty({ type: Object })
  metadata: Record<string, unknown>;

  @ApiPropertyOptional({ nullable: true })
  targetId: string | null;

  @ApiProperty({ enum: ObjectType })
  targetType: ObjectType;

  @ApiProperty({ enum: ["actor", "org", "admin_only"] })
  visibility: "actor" | "org" | "admin_only";

  @ApiProperty()
  createdAt: string;
}

export class UserAuditItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: "Activity action, e.g. api/createJob" })
  action: string;

  @ApiProperty({ enum: ObjectType })
  targetType: ObjectType;

  @ApiPropertyOptional({ nullable: true })
  targetId: string | null;

  @ApiProperty({ description: "User-facing message" })
  message: string;

  @ApiProperty({
    type: [AuditMarkDto],
    description: "Bold ranges (UTF-16 indexes) for FE",
  })
  marks: AuditMarkDto[];

  @ApiProperty()
  createdAt: string;
}
