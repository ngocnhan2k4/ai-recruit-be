import { IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { GetUserDto } from "../users/user.dto";
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

export class LoginResponseDto {
  @ApiProperty({ type: () => TokenPairDto })
  tokens: TokenPairDto;

  @ApiProperty({ type: () => GetUserDto })
  user: GetUserDto;

  constructor(tokens: TokenPairDto, user: GetUserDto) {
    this.tokens = tokens;
    this.user = user;
  }
}
