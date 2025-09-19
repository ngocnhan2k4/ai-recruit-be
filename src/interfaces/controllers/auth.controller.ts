import { Body, Controller, Post, UseGuards, Req, Get } from "@nestjs/common";
import { AuthUseCases } from "src/use-cases/auth/auth.use-case";
import { LoginDto, LoginResponseDto } from "../dtos";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards/jwt-auth.guard";

@Controller("auth")
export class AuthController {
    constructor(private readonly authUseCases: AuthUseCases) {}
    @Post("login")
    async logIn(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
        console.log("idToken", loginDto.idToken);
        return this.authUseCases.logIn(loginDto.idToken);
    }

    @UseGuards(JwtAuthGuard)
    @Get("profile")
    getProfile(@Req() req) {
        return req.user;
    }
}
