import { ApiProperty } from "@nestjs/swagger";

export class SchoolDto {
  @ApiProperty({ type: "string", format: "uuid" })
  organizationId: string;

  @ApiProperty({ type: "string" })
  schoolType: string;
}
