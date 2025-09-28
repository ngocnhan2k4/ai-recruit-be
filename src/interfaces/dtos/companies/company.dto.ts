import { ApiProperty } from "@nestjs/swagger";

export class CompanyDto {
  @ApiProperty({ type: "string", format: "uuid" })
  id: string;

  @ApiProperty({ type: "string" })
  name: string;

  @ApiProperty({ type: "string", nullable: true })
  logoUrl: string | null;

  @ApiProperty({ type: "string", nullable: true })
  description: string | null;

  @ApiProperty({ type: "array", items: { type: "string" }, nullable: true })
  address: string[] | null;

  @ApiProperty({ type: "number" })
  employeesMin: number;

  @ApiProperty({ type: "number" })
  employeesMax: number;

  @ApiProperty({ type: "string", nullable: true })
  websiteUrl: string | null;
}
