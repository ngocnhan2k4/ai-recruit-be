import { IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginRequestDto {
  @IsString()
  @ApiProperty({ example: "eyJhbGciOiJSUzI1NiIsImtpZCI6..." })
  idToken: string;
}
