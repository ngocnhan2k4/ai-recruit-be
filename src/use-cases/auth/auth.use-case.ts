import { Injectable, UnauthorizedException } from "@nestjs/common";
import { IAuthServices, User } from "@/core";
import { IDataServices } from "@/core/abstracts/data-services.abstract";
import { ApiResponse, GetUserDto } from "@/interfaces/dtos";
import { AnonymousId, RoleEnum } from "@/common/constants/roles";
import { randomBytes } from "crypto";
import { ConfigService } from "@nestjs/config";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants/response";
import { TokenPayload } from "@/common/types/token";
import { generateUsername } from "@/common/utils/string";
@Injectable()
export class AuthUseCases {
  constructor(
    private readonly authService: IAuthServices,
    private readonly dataServices: IDataServices,
    private readonly configService: ConfigService,
  ) {}

  async logIn(idToken: string): Promise<
    ApiResponse<{
      tokens: { accessToken: string; refreshToken: string };
      user: GetUserDto;
    }>
  > {
    let decode: {
      uid: string;
      email?: string;
      name?: string;
      picture?: string;
      provider_id?: string;
    };
    try {
      decode = await this.authService.verifyIdToken(idToken);
    } catch {
      throw new UnauthorizedException({
        message: RESPONSE_MESSAGE.INVALID_CREDENTIALS,
        code: RESPONSE_CODE.INVALID_CREDENTIALS,
      });
    }
    let user: User | null = null;
    if (decode.provider_id !== "anonymous") {
      user = await this.dataServices.users.getByField({
        firebaseUid: decode.uid,
      });
      if (!user) {
        user = await this.dataServices.users.create(
          new User({
            username: generateUsername(decode.name!), // [TODO]: check exist username here
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
    } else {
      user = {
        id: AnonymousId,
        username: "Anonymous",
        roles: [RoleEnum.ANONYMOUS],
        firebaseUid: decode.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
        name: "Anonymous",
        email: null,
        avatarUrl: null,
        phone: null,
        dob: null,
        deletedAt: null,
        gender: null,
        emailVerified: false,
      };
    }
    const { accessToken, refreshToken } = await this.issueNewTokens(user);
    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: {
        tokens: { accessToken, refreshToken },
        user: GetUserDto.from(user),
      },
    };
  }
  private async issueNewTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: TokenPayload = {
      sub: user.id,
      roles: user.roles,
    };
    const accessToken = this.authService.signJwt(payload);
    const refreshToken = randomBytes(48).toString("hex");

    const newDate = new Date();
    const refreshExpiresIn =
      this.configService.get<number>("REFRESH_EXPIRES_IN")!;
    const refreshTokenExpires = new Date(
      newDate.getTime() + refreshExpiresIn * 24 * 60 * 60 * 1000,
    ); // 7 days
    await this.dataServices.refreshTokens.create({
      userId: user.id,
      token: refreshToken,
      createdAt: newDate,
      expiresAt: new Date(refreshTokenExpires),
      revoked: false,
    });
    return { accessToken, refreshToken };
  }

  async refreshToken(
    oldRefreshToken: string,
  ): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> {
    const storedToken =
      await this.dataServices.refreshTokens.findValidToken(oldRefreshToken);
    if (!storedToken) {
      throw new UnauthorizedException({
        message: RESPONSE_MESSAGE.INVALID_CREDENTIALS,
        code: RESPONSE_CODE.INVALID_CREDENTIALS,
      });
    }
    const user = await this.dataServices.users.get(storedToken.userId);
    const { accessToken, refreshToken } = await this.issueNewTokens(user!);
    await this.dataServices.refreshTokens.revoke(oldRefreshToken);
    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: { accessToken, refreshToken },
    };
  }
  async logout(refreshToken: string): Promise<ApiResponse<any>> {
    const storedToken =
      await this.dataServices.refreshTokens.findValidToken(refreshToken);
    if (!storedToken) {
      throw new UnauthorizedException({
        message: RESPONSE_MESSAGE.INVALID_CREDENTIALS,
        code: RESPONSE_CODE.INVALID_CREDENTIALS,
      });
    }
    await this.dataServices.refreshTokens.revoke(refreshToken);
    return {
      message: "Logged out successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }
}
