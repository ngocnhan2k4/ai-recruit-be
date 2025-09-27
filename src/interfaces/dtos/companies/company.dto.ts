import { ApiProperty } from "@nestjs/swagger";

export class CompanyDto {
  @ApiProperty({ type: "string", format: "uuid" })
  id: string;

  @ApiProperty({ type: "string" })
  name: string;

  @ApiProperty({ type: "string", nullable: true })
  logo_url: string | null;

  @ApiProperty({ type: "string", nullable: true })
  description: string | null;

  @ApiProperty({ type: "array", items: { type: "string" }, nullable: true })
  address: string[] | null;

  @ApiProperty({ type: "number" })
  employees_min: number;

  @ApiProperty({ type: "number" })
  employees_max: number;

  @ApiProperty({ type: "string", nullable: true })
  website_url: string | null;
}
