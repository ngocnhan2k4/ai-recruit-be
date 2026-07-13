import { RESPONSE_CODE, RESPONSE_MESSAGE, RoleEnum } from "@/common/constants";
import { TokenPayload } from "@/common/types";
import {
  buildDeletedEmail,
  buildDeletedFirebaseUid,
  buildDeletedPhone,
  generateUsername,
} from "@/common/utils";
import {
  getFirebaseProviderKey,
  normalizeProvider,
} from "@/common/utils/firebase";
import {
  IAuthRepository,
  IAuthService,
  ISubscriptionRepository,
  IUserFeatureUsageRepository,
  IUserRepository,
  NewUser,
  ProviderEnum,
  SubscriptionEnum,
  User,
  UserStatusEnum,
  UserSubscriptionStatusEnum,
} from "@/core";
import { IUserSubscriptionRepository } from "@/core/abstracts/repositories/user-subscription-repository.abstract";
import { CasbinService } from "@/frameworks/auth-services/casbin/casbin.service";
import { DBDrizzleTransaction } from "@/frameworks/data-services/postgres/types";
import { ApiResponse, GetUserResponseDto } from "@/interfaces/dtos";
import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "crypto";

@Injectable()
export class AuthUseCases {
  private readonly logger = new Logger(AuthUseCases.name);
  private readonly blockedLoginStatuses = new Set<UserStatusEnum>([
    UserStatusEnum.BANNED,
    UserStatusEnum.DELETED,
  ]);
  private readonly blockedRefreshStatuses = new Set<UserStatusEnum>([
    UserStatusEnum.BANNED,
    UserStatusEnum.PENDING_DELETION,
    UserStatusEnum.DELETED,
  ]);
  constructor(
    private readonly authService: IAuthService,
    private readonly authRepository: IAuthRepository,
    private readonly userRepository: IUserRepository,
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly userSubscriptionRepo: IUserSubscriptionRepository,
    private readonly userFeatureUsageRepo: IUserFeatureUsageRepository,
    private readonly configService: ConfigService,
    private readonly casbinService: CasbinService,
  ) {}

  private assertUserCanLogIn(user: User): void {
    if (this.blockedLoginStatuses.has(String(user.status) as UserStatusEnum)) {
      throw new UnauthorizedException({
        message: "User account is not available for authentication",
        code: RESPONSE_CODE.UNAUTHORIZED,
      });
    }
  }

  private assertUserCanRefresh(user: User): void {
    if (
      this.blockedRefreshStatuses.has(String(user.status) as UserStatusEnum)
    ) {
      throw new UnauthorizedException({
        message: "User account is not available for authentication",
        code: RESPONSE_CODE.UNAUTHORIZED,
      });
    }
  }

  private async finalizeExpiredPendingDeletionIfNeeded(
    user: User,
  ): Promise<User | null> {
    if (String(user.status) !== String(UserStatusEnum.PENDING_DELETION)) {
      return user;
    }

    if (!user.purgeAfterAt) {
      return user;
    }

    if (new Date(user.purgeAfterAt).getTime() > Date.now()) {
      return user;
    }

    const finalizedAt = new Date();
    const timestampMs = finalizedAt.getTime();
    const deletedUsername = `deleted_${user.id}_${timestampMs}`;
    await this.userRepository.executeWithTransaction(async (tx) => {
      await this.authRepository.revokeAllForUser(user.id);
      await this.userRepository.update(
        { id: user.id },
        {
          status: UserStatusEnum.DELETED,
          username: deletedUsername,
          email: buildDeletedEmail(user, timestampMs),
          phone: buildDeletedPhone(user, timestampMs),
          firebaseUid: buildDeletedFirebaseUid(user, timestampMs),
          deletedAt: finalizedAt,
          purgeAfterAt: null,
          updatedAt: finalizedAt,
        },
        tx,
      );
    });

    return null;
  }

  private async createUserFromIdentity(params: {
    decode: {
      uid: string;
      email?: string;
      name?: string;
      picture?: string;
      provider_id?: string;
      roles?: RoleEnum[];
      emailVerified?: boolean;
    };
    currentProvider: ProviderEnum;
    resolvedProviderUserId?: string;
    providerEmail?: string | null;
    providerName?: string | null;
    providerPicture?: string | null;
  }): Promise<User> {
    const {
      decode,
      currentProvider,
      resolvedProviderUserId,
      providerEmail,
      providerName,
      providerPicture,
    } = params;

    const newUser: NewUser = {
      username: generateUsername(decode.name || decode.email || "user"),
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

    const user = await this.userRepository.executeWithTransaction(
      async (tx) => {
        const _user = await this.createUserWithSubscription(newUser, tx);
        await this.userRepository.addUserIdentity(
          {
            userId: _user.id,
            provider: currentProvider,
            providerUserId: resolvedProviderUserId,
            providerEmail,
            providerName,
            providerPicture,
          },
          tx,
        );

        return _user;
      },
    );

    await this.authService.updateUserClaims(decode.uid, {
      roles: decode.roles as RoleEnum[],
    });

    for (const role of decode.roles || [RoleEnum.USER]) {
      await this.casbinService.addRoleForUser(user.id, role);
    }
    await this.casbinService.savePolicy();

    return user;
  }

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
      identities: {
        "google.com"?: string[];
        "facebook.com"?: string[];
        "github.com"?: string[];
      };
    };
    try {
      decode = await this.authService.verifyIdToken(idToken);
    } catch {
      throw new UnauthorizedException({
        message: RESPONSE_MESSAGE.INVALID_CREDENTIALS,
        code: RESPONSE_CODE.INVALID_CREDENTIALS,
      });
    }
    const currentProvider = normalizeProvider(
      decode.provider_id || ProviderEnum.EMAIL,
    );

    const firebaseIdentities = decode.identities as
      | Record<string, string[] | undefined>
      | undefined;
    const firebaseProviderKey = getFirebaseProviderKey(currentProvider);
    const providerUserId = firebaseIdentities?.[firebaseProviderKey]?.[0];

    let providerInfo: {
      email: string | null;
      name: string | null;
      picture: string | null;
      userId: string | null;
    } | null = null;

    const profiles = await this.authService.getUserProviderProfiles(decode.uid);
    const currentProfile = profiles.find(
      (p) => p.providerId === firebaseProviderKey,
    );
    if (currentProfile) {
      providerInfo = {
        userId: currentProfile.providerUserId ?? providerUserId ?? null,
        email: currentProfile.email ?? null,
        name: currentProfile.name ?? null,
        picture: currentProfile.picture ?? null,
      };
    }
    let user =
      (
        await this.userRepository.getByField({
          firebaseUid: decode.uid,
        })
      )[0] || null;
    if (!user) {
      user = await this.createUserFromIdentity({
        decode,
        currentProvider,
        resolvedProviderUserId: providerInfo?.userId || undefined,
        providerEmail: providerInfo?.email,
        providerName: providerInfo?.name,
        providerPicture: providerInfo?.picture,
      });
    } else {
      const userAfterFinalize =
        await this.finalizeExpiredPendingDeletionIfNeeded(user);

      if (!userAfterFinalize) {
        user = await this.createUserFromIdentity({
          decode,
          currentProvider,
          resolvedProviderUserId: providerInfo?.userId || undefined,
          providerEmail: providerInfo?.email,
          providerName: providerInfo?.name,
          providerPicture: providerInfo?.picture,
        });
      } else {
        user = userAfterFinalize;
      }

      if (!user) {
        throw new UnauthorizedException({
          message: RESPONSE_MESSAGE.INVALID_CREDENTIALS,
          code: RESPONSE_CODE.INVALID_CREDENTIALS,
        });
      }

      this.assertUserCanLogIn(user);
    }

    if (!user) {
      throw new UnauthorizedException({
        message: RESPONSE_MESSAGE.INVALID_CREDENTIALS,
        code: RESPONSE_CODE.INVALID_CREDENTIALS,
      });
    }

    const { accessToken, refreshToken } = await this.issueNewTokens(user);
    const loginMethods = await this.userRepository.getUserLoginMethods(user.id);
    const otherProviders = loginMethods
      .filter((m) => m.provider !== user.provider)
      .map((m) => ({
        provider: m.provider as any,
        createdAt: m.createdAt,
        providerUserId: m.providerUserId ?? null,
        providerEmail: m.providerEmail ?? null,
        providerName: m.providerName ?? null,
        providerPicture: m.providerPicture ?? null,
      }));

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
      message:
        String(user.status) === String(UserStatusEnum.PENDING_DELETION)
          ? RESPONSE_MESSAGE.ACCOUNT_PENDING_DELETION
          : RESPONSE_MESSAGE.SUCCESS,
      code:
        String(user.status) === String(UserStatusEnum.PENDING_DELETION)
          ? RESPONSE_CODE.ACCOUNT_PENDING_DELETION
          : RESPONSE_CODE.SUCCESS,
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
      status: user.status as UserStatusEnum,
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
    if (!user) {
      throw new UnauthorizedException({
        message: RESPONSE_MESSAGE.INVALID_CREDENTIALS,
        code: RESPONSE_CODE.INVALID_CREDENTIALS,
      });
    }
    this.assertUserCanRefresh(user);
    const { accessToken, refreshToken } = await this.issueNewTokens(user);
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
    const user = await this.userRepository.create(newUser, tx);

    this.logger.log("Created user successfully with user = ", user);

    const freeSub = await this.subscriptionRepo.getListSubscriptions({
      limit: 1,
      exactName: SubscriptionEnum.FREE,
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

      const sf = await this.subscriptionRepo.getSubscriptionFeatures(
        freeSub.data[0].id,
      );
      const data = sf.map((r) => ({
        userId: user.id,
        featureId: r.id,
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
