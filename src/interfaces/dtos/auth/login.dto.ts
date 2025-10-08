import { IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { GetUserResponseDto } from "../users/user.dto";
export class LoginRequestDto {
  @IsString()
  @ApiProperty({ example: "eyJhbGciOiJSUzI1NiIsImtpZCI6..." })
  idToken: string;
}

export class AccessTokenResponseDto {
  @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ..." })
  accessToken: string;
}

export class LoginResponseDto {
  @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ..." })
  accessToken: string;

  @ApiProperty({ type: () => GetUserResponseDto })
  user: GetUserResponseDto;
}
