import { ApiProperty } from "@nestjs/swagger";

export class ProvinceDto {
  @ApiProperty({ type: "string", format: "uuid" })
  id: string;

  @ApiProperty({ type: "string" })
  name: string;
}
