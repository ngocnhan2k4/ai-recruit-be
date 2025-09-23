import { Injectable } from "@nestjs/common";
import { IAuthServices, RefreshToken, User } from "@/core";
import { IDataServices } from "@/core/abstracts/data-services.abstract";
import { ApiResponse } from "@/interfaces/dtos";
import { RoleEnum } from "@/core/enums/roles";
import { randomBytes } from "crypto";
import { ConfigService } from "@nestjs/config";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants/constants";
@Injectable()
export class AuthUseCases {
  constructor(
    private readonly authService: IAuthServices,
    private readonly dataServices: IDataServices,
    private readonly configService: ConfigService,
  ) {}
  async logIn(idToken: string): Promise<ApiResponse<any>> {
    const decode = await this.authService.verifyIdToken(idToken);
    let user = await this.dataServices.users.getByField({
      firebaseUid: decode.uid,
    });
    if (!user) {
      user = await this.dataServices.users.create(
        new User({
          username: decode.name!,
          email: decode.email,
          avatarUrl: decode.picture,
          firebaseUid: decode.uid,
          roles: [RoleEnum.USER],
          name: decode.name!,
        }),
      );
    } else {
      // Update user info if necessary
    }
    const { accessToken, refreshToken } = await this.issueNewTokens(user);
    return new ApiResponse(RESPONSE_MESSAGE.SUCCESS, RESPONSE_CODE.SUCCESS, {
      accessToken,
      refreshToken,
    });
  }
  private async issueNewTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = {
      sub: user.id,
      uid: user.firebaseUid,
      roles: user.roles,
    };
    const accessToken = this.authService.signJwt(payload);
    const refreshToken = randomBytes(48).toString("hex");

    const newDate = new Date();
    const refreshExpiresIn =
      this.configService.get<number>("REFRESH_EXPIRES_IN") || 7;
    const refreshTokenExpries = new Date(
      newDate.getTime() + refreshExpiresIn * 24 * 60 * 60 * 1000,
    ); // 7 days
    await this.dataServices.refreshTokens.create(
      new RefreshToken({
        userId: user.id,
        token: refreshToken,
        createdAt: newDate,
        expiresAt: new Date(refreshTokenExpries),
        revoked: false,
      }),
    );
    return { accessToken, refreshToken };
  }

  async refreshToken(oldRefreshToken: string): Promise<ApiResponse<any>> {
    const storedToken =
      await this.dataServices.refreshTokens.findValidToken(oldRefreshToken);
    if (!storedToken) {
      return new ApiResponse(
        RESPONSE_MESSAGE.INVALID_CREDENTIALS,
        RESPONSE_CODE.INVALID_CREDENTIALS,
      );
    }
    const user = await this.dataServices.users.get(storedToken.userId);
    if (!user) {
      return new ApiResponse(
        RESPONSE_MESSAGE.USER_NOT_FOUND,
        RESPONSE_CODE.USER_NOT_FOUND,
      );
    }
    const { accessToken, refreshToken } = await this.issueNewTokens(user);
    await this.dataServices.refreshTokens.revoke(oldRefreshToken);
    return new ApiResponse(RESPONSE_MESSAGE.SUCCESS, RESPONSE_CODE.SUCCESS, {
      accessToken,
      refreshToken,
    });
  }
  async logout(refreshToken: string): Promise<ApiResponse<any>> {
    const storedToken =
      await this.dataServices.refreshTokens.findValidToken(refreshToken);
    if (!storedToken) {
      return new ApiResponse(
        RESPONSE_MESSAGE.INVALID_CREDENTIALS,
        RESPONSE_CODE.INVALID_CREDENTIALS,
      );
    }
    const user = await this.dataServices.users.get(storedToken.userId);
    if (!user) {
      return new ApiResponse(
        RESPONSE_MESSAGE.USER_NOT_FOUND,
        RESPONSE_CODE.USER_NOT_FOUND,
      );
    }
    await this.dataServices.refreshTokens.revoke(refreshToken);
    return new ApiResponse(RESPONSE_MESSAGE.SUCCESS, RESPONSE_CODE.SUCCESS, {
      message: "Logged out successfully",
    });
  }
}
