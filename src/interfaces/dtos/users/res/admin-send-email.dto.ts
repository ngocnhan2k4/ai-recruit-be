import { ApiProperty } from "@nestjs/swagger";
import { AdminEmailTemplateId } from "@/core";

export class AdminSendEmailResponseDto {
  @ApiProperty({ example: 42 })
  queued: number;

  @ApiProperty({ example: 2 })
  skippedNoEmail: number;

  @ApiProperty({ example: 44 })
  totalRequested: number;
}

export class AdminEmailTemplateResponseDto {
  @ApiProperty({ enum: AdminEmailTemplateId })
  id: AdminEmailTemplateId;

  @ApiProperty()
  label: string;

  @ApiProperty()
  defaultSubject: string;

  @ApiProperty()
  defaultBody: string;
}
