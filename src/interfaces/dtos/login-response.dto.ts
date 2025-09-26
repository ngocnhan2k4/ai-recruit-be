import { GetUserDto, TokenPairDto } from "./index";

export class LoginResponseDto {
  tokens: TokenPairDto;
  user: GetUserDto;

  constructor(tokens: TokenPairDto, user: GetUserDto) {
    this.tokens = tokens;
    this.user = user;
  }
}
