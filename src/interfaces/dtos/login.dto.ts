import { IsString } from "class-validator";

export class LoginDto {
    @IsString()
    idToken: string;
}

export class RefreshTokenDto {
    @IsString()
    refreshToken: string;
}