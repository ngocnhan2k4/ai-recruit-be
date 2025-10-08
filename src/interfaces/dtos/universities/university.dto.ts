import { ApiProperty } from "@nestjs/swagger";

export class UniversityDto {
  @ApiProperty({ type: "string", format: "uuid" })
  id: string;

  @ApiProperty({ type: "string" })
  name: string;
}
