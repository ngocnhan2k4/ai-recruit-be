import { IsString, IsBoolean, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginRequestDto {
  @IsString()
  @ApiProperty({ example: "eyJhbGciOiJSUzI1NiIsImtpZCI6..." })
  idToken: string;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ example: false, required: false })
  rememberMe?: boolean;
}
