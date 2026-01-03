import { ApiProperty } from "@nestjs/swagger";
import { GetUserResponseDto } from "../../users/res/user.dto";

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
