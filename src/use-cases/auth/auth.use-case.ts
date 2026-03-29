import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import {
  IAuthService,
  ISubscriptionRepository,
  IUserFeatureUsageRepository,
  NewUser,
  ProviderEnum,
  SubscriptionEnum,
  User,
  UserSubscriptionStatusEnum,
} from "@/core";
import { IAuthRepository, IUserRepository } from "@/core";
import { ApiResponse, GetUserResponseDto } from "@/interfaces/dtos";
import { RoleEnum } from "@/common/constants";
import { randomBytes } from "crypto";
import { ConfigService } from "@nestjs/config";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants";
import { TokenPayload } from "@/common/types";
import { generateUsername } from "@/common/utils";
import { normalizeProvider } from "@/common/utils/firebase";
import { CasbinService } from "@/frameworks/auth-services/casbin/casbin.service";
import { IUserSubscriptionRepository } from "@/core/abstracts/repositories/user-subscription-repository.abstract";
import { ISubscriptionFeatureRepository } from "@/core/abstracts/repositories/subscription-feature-repository.abstract";
import { DBDrizzleTransaction } from "@/frameworks/data-services/postgres/types";

@Injectable()
export class AuthUseCases {
  private readonly logger = new Logger(AuthUseCases.name);
  constructor(
    private readonly authService: IAuthService,
    private readonly authRepository: IAuthRepository,
    private readonly userRepository: IUserRepository,
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly userSubscriptionRepo: IUserSubscriptionRepository,
    private readonly userFeatureUsageRepo: IUserFeatureUsageRepository,
    private readonly subFeatureRepo: ISubscriptionFeatureRepository,
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
      firebase?: {
        identities: {
          "google.com"?: string[];
          "facebook.com"?: string[];
          "github.com"?: string[];
        };
      };
    };
    try {
      decode = await this.authService.verifyIdToken(idToken);
      console.log("Decoded token in use case: ", decode.firebase);
    } catch {
      throw new UnauthorizedException({
        message: RESPONSE_MESSAGE.INVALID_CREDENTIALS,
        code: RESPONSE_CODE.INVALID_CREDENTIALS,
      });
    }
    const currentProvider = normalizeProvider(
      decode.provider_id || ProviderEnum.EMAIL,
    );

    const firebaseIdentities =
      (decode.firebase?.identities as Record<string, string[] | undefined>) ||
      undefined;
    const firebaseProviderKey =
      decode.provider_id ||
      (currentProvider === ProviderEnum.GOOGLE
        ? "google.com"
        : currentProvider === ProviderEnum.FACEBOOK
          ? "facebook.com"
          : currentProvider === ProviderEnum.GITHUB
            ? "github.com"
            : "password");
    const providerUserId = firebaseIdentities?.[firebaseProviderKey]?.[0];
    let user =
      (
        await this.userRepository.getByField({
          firebaseUid: decode.uid,
        })
      )[0] || null;
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
      user = await this.userRepository.executeWithTransaction(async (tx) => {
        const _user = await this.createUserWithSubscription(newUser, tx);
        await this.userRepository.addUserIdentity(
          {
            userId: _user.id,
            provider: currentProvider,
            providerUserId,
          },
          tx,
        );

        return _user;
      });

      // Set custom user claims in Firebases
      await this.authService.updateUserClaims(decode.uid, {
        roles: decode.roles as RoleEnum[],
      });

      // Assign roles in Casbin (ptype "g")
      for (const role of decode.roles || [RoleEnum.USER]) {
        await this.casbinService.addRoleForUser(user.id, role);
      }
      await this.casbinService.savePolicy();
    } else {
      await this.userRepository.addUserIdentity({
        userId: user.id,
        provider: currentProvider,
        providerUserId,
      });
    }

    const loginMethods = await this.userRepository.getUserLoginMethods(user.id);
    const otherProviders = loginMethods
      .filter((m) => m.provider !== user.provider)
      .map((m) => ({ provider: m.provider as any, createdAt: m.createdAt }));

    const { accessToken, refreshToken } = await this.issueNewTokens(user);
    const userDto = GetUserResponseDto.from({
      ...user,
      provider: user.provider as ProviderEnum,
      roles: user.roles as RoleEnum[],
      otherProviders,
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
  async createUserWithSubscription(
    newUser: NewUser,
    tx: DBDrizzleTransaction,
  ): Promise<User> {
    const user = await this.userRepository.createUser(newUser, tx);

    this.logger.log("Created user successfully with user = ", user);

    const freeSub = await this.subscriptionRepo.getListSubscriptions({
      limit: 1,
      name: SubscriptionEnum.FREE,
      skipCount: true,
    });

    if (freeSub.data.length > 0) {
      await this.userSubscriptionRepo.create(
        {
          userId: user.id,
          subscriptionId: freeSub.data[0].id,
          status: UserSubscriptionStatusEnum.ACTIVE,
        },
        tx,
      );

      this.logger.log(
        "Created user subscription successfully for user id = ",
        user.id,
      );

      const sf = await this.subFeatureRepo.getByField(
        {
          subscriptionId: freeSub.data[0].id,
        },
        ["limit", "subscriptionId"],
      );
      const data = sf.map((r) => ({
        userId: user.id,
        featureId: r.featureId,
        usage: 0,
        lastRefillAt: new Date(),
      }));
      if (data.length > 0) {
        await this.userFeatureUsageRepo.createMany(data, tx);

        this.logger.log(
          "Created user feature usage successfully with data = ",
          data,
        );
      }
    }

    return user;
  }
}
