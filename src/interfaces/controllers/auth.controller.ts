import { Body, Controller, Post, UseGuards, Req, Get } from "@nestjs/common";
import { AuthUseCases } from "src/use-cases/auth/auth.use-case";
import { LoginDto, LoginResponseDto, RefreshTokenDto } from "../dtos";

@Controller("auth")
export class AuthController {
    constructor(private readonly authUseCases: AuthUseCases) {}
    @Post("login")
    async logIn(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
        return this.authUseCases.logIn(loginDto.idToken);
    }

    @Post("refresh")
    async refresh(@Body() body : RefreshTokenDto): Promise<LoginResponseDto> {
        return this.authUseCases.refreshToken(body.refreshToken);
    }

    @Post("logout")
    async logout(@Body() body: RefreshTokenDto): Promise<void> {
        return this.authUseCases.logout(body.refreshToken);
    }
}
