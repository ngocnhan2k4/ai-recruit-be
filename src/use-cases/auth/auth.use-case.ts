import { Injectable, UnauthorizedException } from "@nestjs/common";
import { IAuthService, NewUser, ProviderEnum, User } from "@/core";
import {
  IAuthRepository,
  IUserRepository,
  IUserOnboardingRepository,
} from "@/core";
import { ApiResponse, GetUserResponseDto } from "@/interfaces/dtos";
import { RoleEnum } from "@/common/constants";
import { randomBytes } from "crypto";
import { ConfigService } from "@nestjs/config";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants";
import { TokenPayload } from "@/common/types";
import { generateUsername } from "@/common/utils";
import { normalizeProvider } from "@/common/utils/firebase";
import { CasbinService } from "@/frameworks/auth-services/casbin/casbin.service";

@Injectable()
export class AuthUseCases {
  constructor(
    private readonly authService: IAuthService,
    private readonly authRepository: IAuthRepository,
    private readonly userRepository: IUserRepository,
    private readonly userOnboardingRepository: IUserOnboardingRepository,
    private readonly configService: ConfigService,
    private readonly casbinService: CasbinService,
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
      roles?: RoleEnum[];
      emailVerified?: boolean;
    };
    try {
      decode = await this.authService.verifyIdToken(idToken);
    } catch {
      throw new UnauthorizedException({
        message: RESPONSE_MESSAGE.INVALID_CREDENTIALS,
        code: RESPONSE_CODE.INVALID_CREDENTIALS,
      });
    }
    let user =
      (
        await this.userRepository.getByField({
          firebaseUid: decode.uid,
        })
      )[0] || null;

    if (!user && decode.email && decode.emailVerified === true) {
      const existingByEmail = (
        await this.userRepository.getByField({
          email: decode.email,
        })
      )[0];
      if (existingByEmail) {
        const patch: Partial<User> = {
          firebaseUid: decode.uid,
          provider: normalizeProvider(
            decode.provider_id || ProviderEnum.EMAIL,
          ) as User["provider"],
        };
        if (decode.picture && !existingByEmail.avatarUrl) {
          patch.avatarUrl = decode.picture;
        }
        const [merged] = await this.userRepository.update(
          { id: existingByEmail.id },
          patch,
        );
        user = merged ?? null;
        if (user) {
          await this.authService.updateUserClaims(decode.uid, {
            roles: (user.roles || []) as RoleEnum[],
          });
        }
      }
    }

    if (!user) {
      const newUser: NewUser = {
        username: generateUsername(decode.name || decode.email || "user"), // [TODO]: check exist username here
        email: decode.email ?? null,
        avatarUrl: decode.picture ?? null,
        firebaseUid: decode.uid,
        roles: decode.roles || [RoleEnum.USER],
        name: decode.name ?? "",
        gender: null,
        dob: null,
        phone: null,
        provider: normalizeProvider(decode.provider_id || ProviderEnum.EMAIL),
        emailVerified: decode.emailVerified,
      };
      user = await this.userRepository.createUser(newUser);

      // Set custom user claims in Firebase
      await this.authService.updateUserClaims(decode.uid, {
        roles: decode.roles as RoleEnum[],
      });

      // Assign roles in Casbin (ptype "g")
      for (const role of decode.roles || [RoleEnum.USER]) {
        await this.casbinService.addRoleForUser(user.id, role);
      }
      await this.casbinService.savePolicy();
    }

    const { accessToken, refreshToken } = await this.issueNewTokens(user);
    const userDto = GetUserResponseDto.from({
      ...user,
      provider: user.provider as ProviderEnum,
      roles: user.roles as RoleEnum[],
    });

    // const customToken = await this.authService.customTokenWithClaims(
    //   user.firebaseUid!,
    //   {
    //     roles: user.roles as RoleEnum[],
    //   },
    // );

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: {
        tokens: { accessToken, refreshToken },
        user: userDto,
      },
    };
  }
  private async issueNewTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: TokenPayload = {
      userId: user.id,
      roles: user.roles as RoleEnum[],
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
