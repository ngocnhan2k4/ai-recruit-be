import { IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
export class LoginDto {
  @IsString()
  @ApiProperty({ example: "eyJhbGciOiJSUzI1NiIsImtpZCI6..." })
  idToken: string;
}

export class RefreshTokenDto {
  @IsString()
  @ApiProperty({ example: "f2f374604e2462c13f441457a68c2644ce..." })
  refreshToken: string;
}

export class TokenPairDto {
  @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ..." })
  accessToken: string;

  @ApiProperty({ example: "f2f374604e2462c13f441457a68c2644ce..." })
  refreshToken: string;
}
