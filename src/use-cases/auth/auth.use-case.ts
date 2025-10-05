import { Injectable, UnauthorizedException } from "@nestjs/common";
import { IAuthService, NewUser, User } from "@/core";
import { IAuthRepository, IUserRepository } from "@/core";
import { ApiResponse, GetUserResponseDto } from "@/interfaces/dtos";
import { AnonymousId, RoleEnum } from "@/common/constants/roles";
import { randomBytes } from "crypto";
import { ConfigService } from "@nestjs/config";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants/response";
import { TokenPayload } from "@/common/types/token";
import { generateUsername } from "@/common/utils/string";
import { normalizeProvider } from "@/common/utils/firebase";
@Injectable()
export class AuthUseCases {
  constructor(
    private readonly authService: IAuthService,
    private readonly authRepository: IAuthRepository,
    private readonly userRepository: IUserRepository,
    private readonly configService: ConfigService,
  ) {}

  async logIn(idToken: string): Promise<
    ApiResponse<{
      tokens: { accessToken: string; refreshToken: string };
      user: GetUserResponseDto;
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
    console.log("decode", decode);
    if (decode.provider_id !== "anonymous") {
      user =
        (
          await this.userRepository.getByField({
            firebaseUid: decode.uid,
          })
        )[0] || null;
      if (!user) {
        const newUser: NewUser = {
          username: generateUsername(decode.name!), // [TODO]: check exist username here
          email: decode.email ?? null,
          avatarUrl: decode.picture ?? null,
          firebaseUid: decode.uid,
          // roles: [RoleEnum.USER],
          name: decode.name!,
          gender: null,
          dob: null,
          phone: null,
          provider: normalizeProvider(decode.provider_id || "email"),
        };
        user = await this.userRepository.create(newUser);
      } else {
        // Update user info if necessary
      }
    } else {
      user = {
        id: AnonymousId,
        username: "Anonymous",
        // roles: [RoleEnum.ANONYMOUS],
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
        phoneVerified: false,
        bio: null,
        bannerUrl: null,
        provider: "anonymous",
      };
    }
    const { accessToken, refreshToken } = await this.issueNewTokens(user);
    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: {
        tokens: { accessToken, refreshToken },
        user: GetUserResponseDto.from(user),
      },
    };
  }
  private async issueNewTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: TokenPayload = {
      userId: user.id,
      roles: [RoleEnum.USER], // [TODO]: get roles from user
    };
    const accessToken = this.authService.signJwt(payload);
    const refreshToken = randomBytes(48).toString("hex");

    const newDate = new Date();
    const refreshExpiresIn =
      this.configService.get<number>("REFRESH_EXPIRES_IN")!;
    const refreshTokenExpires = new Date(
      newDate.getTime() + refreshExpiresIn * 24 * 60 * 60 * 1000,
    ); // 7 days
    await this.authRepository.create({
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(refreshTokenExpires),
      revoked: false,
    });
    return { accessToken, refreshToken };
  }

  async refreshToken(
    oldRefreshToken: string,
  ): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> {
    const storedToken =
      await this.authRepository.findValidToken(oldRefreshToken);
    if (!storedToken) {
      throw new UnauthorizedException({
        message: RESPONSE_MESSAGE.INVALID_CREDENTIALS,
        code: RESPONSE_CODE.INVALID_CREDENTIALS,
      });
    }
    const user = await this.userRepository.get(storedToken.userId);
    const { accessToken, refreshToken } = await this.issueNewTokens(user!);
    await this.authRepository.revoke(oldRefreshToken);
    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: { accessToken, refreshToken },
    };
  }
  async logout(refreshToken: string): Promise<ApiResponse<any>> {
    const storedToken = await this.authRepository.findValidToken(refreshToken);
    if (!storedToken) {
      throw new UnauthorizedException({
        message: RESPONSE_MESSAGE.INVALID_CREDENTIALS,
        code: RESPONSE_CODE.INVALID_CREDENTIALS,
      });
    }
    await this.authRepository.revoke(refreshToken);
    return {
      message: "Logged out successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }
}
