import { ApiProperty } from "@nestjs/swagger";

export class OrganizationDto {
  @ApiProperty({ type: "string", format: "uuid" })
  id: string;

  @ApiProperty({ type: "string" })
  name: string;

  @ApiProperty({ type: "string" })
  slug: string;

  @ApiProperty({ type: "string" })
  type: string;

  @ApiProperty({ type: "string" })
  description: string | null;

  @ApiProperty({ type: "array", items: { type: "string" } })
  address: string[] | null;

  @ApiProperty({ type: "string" })
  logoUrl: string | null;

  @ApiProperty({ type: "string" })
  about: string | null;

  @ApiProperty({ type: "string" })
  websiteUrl: string | null;

  @ApiProperty({ type: "string" })
  email: string | null;

  @ApiProperty({ type: "string" })
  phone: string | null;

  @ApiProperty({ type: "number" })
  foundedYear: number | null;

  @ApiProperty({ type: "number" })
  employeesMin: number | null;

  @ApiProperty({ type: "number" })
  employeesMax: number | null;

  @ApiProperty({ type: "string", format: "date-time" })
  createdAt: Date;

  @ApiProperty({ type: "string", format: "date-time" })
  updatedAt: Date | null;

  @ApiProperty({ type: "string", format: "date-time" })
  deletedAt: Date | null;

  @ApiProperty({ type: "string" })
  verifiedAt: Date | null;
}
