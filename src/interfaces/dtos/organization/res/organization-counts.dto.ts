import { ApiProperty } from "@nestjs/swagger";

export class OrganizationCountsResponseDto {
  @ApiProperty({ example: 123 })
  companies: number;

  @ApiProperty({ example: 45 })
  schools: number;
}
