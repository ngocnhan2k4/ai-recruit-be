import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsUUID } from "class-validator";

export class CreateLocationDto {
  @ApiProperty({ type: "string" })
  @IsNotEmpty({ message: "Address is required" })
  @IsString()
  address: string;

  @ApiProperty({ type: "string" })
  @IsNotEmpty({ message: "Province ID is required" })
  @IsUUID()
  provinceId: string;
}
