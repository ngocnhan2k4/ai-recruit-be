import { Injectable, UnauthorizedException } from "@nestjs/common";
import { IAuthServices, RefreshToken, User } from "@/core";
import { IDataServices } from "@/core/abstracts/data-services.abstract";
import { LoginResponseDto } from "@/interfaces/dtos";
import { RoleEnum } from "@/core/enums/roles";
import { randomBytes } from "crypto";
import { ConfigService } from "@nestjs/config";
@Injectable()
export class AuthUseCases {
    constructor(private readonly authService: IAuthServices,
        private readonly dataServices: IDataServices,
        private readonly configService: ConfigService
    ) { }
    async logIn(idToken: string): Promise<LoginResponseDto> {
        const decode = await this.authService.verifyIdToken(idToken);
        let user = await this.dataServices.users.getByField({ firebaseUid: decode.uid });
        if (!user) {
            user = await this.dataServices.users.create(new User({
                username: decode.name!,
                email: decode.email,
                avatarUrl: decode.picture,
                firebaseUid: decode.uid,
                roles: [RoleEnum.USER],
                name: decode.name!,

            }));
        } else{
            // Update user info if necessary
        }
        const { accessToken, refreshToken } = await this.issueNewTokens(user);
        return new LoginResponseDto(accessToken, refreshToken, user);
    }
    private async issueNewTokens(user: User): Promise<{ accessToken: string, refreshToken: string }> {
        const payload = {
            sub: user.id,
            uid: user.firebaseUid,
            roles: user.roles,
        };
        const accessToken = this.authService.signJwt(payload);
        const refreshToken = randomBytes(48).toString('hex');

        const newDate = new Date();
        const refreshExpiresIn = this.configService.get<number>('REFRESH_EXPIRES_IN') || 7;
        const refreshTokenExpries = new Date(newDate.getTime() + refreshExpiresIn * 24 * 60 * 60 * 1000); // 7 days
        await this.dataServices.refreshTokens.create(new RefreshToken({
            userId: user.id,
            token: refreshToken,
            createdAt: newDate,
            expiresAt: new Date(refreshTokenExpries),
            revoked: false,
        }));
        return { accessToken, refreshToken };
    }

    async refreshToken(oldRefreshToken: string): Promise<LoginResponseDto> {
        const storedToken = await this.dataServices.refreshTokens.findValidToken(oldRefreshToken);
        if (!storedToken) {
            throw new UnauthorizedException("Invalid refresh token");
        }
        const user = await this.dataServices.users.get(storedToken.userId);
        if (!user) {
            throw new UnauthorizedException("User not found");
        }
        const { accessToken, refreshToken } = await this.issueNewTokens(user);  
        await this.dataServices.refreshTokens.revoke(oldRefreshToken);
        return new LoginResponseDto(accessToken, refreshToken, user);
    }
    async logout(refreshToken: string): Promise<void> {
        const storedToken = await this.dataServices.refreshTokens.findValidToken(refreshToken);
        if (!storedToken) {
            throw new UnauthorizedException("Invalid refresh token");
        }
        const user = await this.dataServices.users.get(storedToken.userId);
        if (!user) {
            throw new UnauthorizedException("User not found");
        }
        await this.dataServices.refreshTokens.revoke(refreshToken);
    }
}