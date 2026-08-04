import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants";
import { ApiResponse } from "@/interfaces/dtos";
import {
  CreateSubscriptionRequestDto,
  SubscriptionFilterDto,
  UpdateUserSubscriptionRequestDto,
  UpdateSubscriptionRequestDto,
  UpsertSubscriptionFeaturesRequestDto,
  RegisterUserSubscriptionResponseDto,
} from "@/interfaces/dtos/subscription";
import {
  CurrencyEnum,
  IFeatureRepository,
  ISubscriptionRepository,
  IUserRepository,
  PaymentProviderEnum,
  Subscription,
  UserSubscription,
  UserSubscriptionStatusEnum,
} from "@/core";
import { IUserSubscriptionRepository } from "@/core/abstracts/repositories/user-subscription-repository.abstract";
import { PaginatedResult } from "@/common/types";
import { GetListSubscriptionResponse } from "@/core/entities/subscription.entity";
import { IPaymentService } from "@/core/abstracts/payment-services.abstract";
import { IExchangeRateService } from "@/core/abstracts/exchange-rate-services.abstract";
import { convertVndToUsd, extractName } from "@/common/utils";
import { ConfigService } from "@nestjs/config";
import { subDays } from "date-fns";

@Injectable()
export class SubscriptionUseCases {
  private readonly logger = new Logger(SubscriptionUseCases.name);
  constructor(
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly userSubscriptionRepo: IUserSubscriptionRepository,
    private readonly featureRepo: IFeatureRepository,
    private readonly paymentService: IPaymentService,
    private readonly exchangeRateService: IExchangeRateService,
    private readonly userRepo: IUserRepository,
    private readonly configService: ConfigService,
  ) {}

  async createSubscription(
    dto: CreateSubscriptionRequestDto,
  ): Promise<ApiResponse<Subscription>> {
    const created = await this.subscriptionRepo.create({
      name: dto.name as "FREE" | "BASIC" | "PRO" | "ENTERPRISE" | undefined,
      price: dto.price,
      billingCycle: dto.billingCycle,
      isActive: dto.isActive ?? true,
    });

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: created,
    };
  }

  async updateSubscription(
    id: string,
    dto: UpdateSubscriptionRequestDto,
  ): Promise<ApiResponse<Subscription>> {
    const [updated] = await this.subscriptionRepo.update(
      { id },
      {
        ...dto,
        name: dto.name as "FREE" | "BASIC" | "PRO" | "ENTERPRISE" | undefined,
      },
    );

    if (!updated) {
      throw new NotFoundException({
        code: RESPONSE_CODE.SUBSCRIPTION_NOT_FOUND,
        message: "Subscription not found",
      });
    }

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: updated,
    };
  }

  async deleteSubscription(id: string): Promise<ApiResponse<Subscription>> {
    const [deleted] = await this.subscriptionRepo.delete({ id });

    if (!deleted) {
      throw new NotFoundException({
        code: RESPONSE_CODE.SUBSCRIPTION_NOT_FOUND,
        message: "Subscription not found",
      });
    }

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: deleted,
    };
  }

  async getSubscriptions(
    query: SubscriptionFilterDto,
  ): Promise<ApiResponse<PaginatedResult<GetListSubscriptionResponse>>> {
    const result = await this.subscriptionRepo.getListSubscriptions(query);

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: result,
    };
  }

  async getSubscriptionById(id: string): Promise<ApiResponse<Subscription>> {
    const existing = await this.subscriptionRepo.get(id);
    if (!existing) {
      throw new NotFoundException({
        code: RESPONSE_CODE.BAD_REQUEST,
        message: "Subscription not found",
      });
    }

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: existing,
    };
  }

  async upsertSubscriptionFeatures(
    subscriptionId: string,
    dto: UpsertSubscriptionFeaturesRequestDto,
  ): Promise<ApiResponse<{ affected: number }>> {
    const sub = await this.subscriptionRepo.get(subscriptionId);
    if (!sub) {
      throw new NotFoundException({
        code: RESPONSE_CODE.BAD_REQUEST,
        message: "Subscription not found",
      });
    }

    const ids = dto.items.map((i) => i.featureId);
    const found = await this.featureRepo.getByIds(ids, ["id"]);
    if (found.length !== ids.length) {
      throw new BadRequestException({
        code: RESPONSE_CODE.BAD_REQUEST,
        message: "Some featureIds do not exist",
      });
    }

    const affected = await this.subscriptionRepo.upsertSubscriptionFeatures(
      subscriptionId,
      dto.items,
    );

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: { affected },
    };
  }

  async deleteSubscriptionFeature(
    subscriptionId: string,
    featureId: number,
  ): Promise<ApiResponse<{ affected: number }>> {
    const sub = await this.subscriptionRepo.get(subscriptionId);
    if (!sub) {
      throw new NotFoundException({
        code: RESPONSE_CODE.SUBSCRIPTION_NOT_FOUND,
        message: "Subscription not found",
      });
    }

    const affected = await this.subscriptionRepo.deleteSubscriptionFeature(
      subscriptionId,
      featureId,
    );

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: { affected },
    };
  }

  async updateUserSubscription(
    id: string,
    dto: UpdateUserSubscriptionRequestDto,
  ): Promise<ApiResponse<UserSubscription>> {
    const existing = await this.userSubscriptionRepo.get(id);
    if (!existing || existing.deletedAt) {
      throw new NotFoundException({
        code: RESPONSE_CODE.BAD_REQUEST,
        message: "User subscription not found",
      });
    }

    if (dto.subscriptionId) {
      const sub = await this.subscriptionRepo.get(dto.subscriptionId);
      if (!sub) {
        throw new NotFoundException({
          code: RESPONSE_CODE.SUBSCRIPTION_NOT_FOUND,
          message: "Subscription not found",
        });
      }
    }

    const updated = await this.userSubscriptionRepo.updateUserSubscription(id, {
      userId: existing.userId,
      subscriptionId: dto.subscriptionId,
      status: dto.status,
      expiredAt: dto.expiredAt ? new Date(dto.expiredAt) : undefined,
    });

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: updated!,
    };
  }

  private async resolvePaymentDetails(
    priceVnd: number,
    provider: PaymentProviderEnum,
  ): Promise<{ currency: CurrencyEnum; amount: number; vndPerUsd?: number }> {
    switch (provider) {
      case PaymentProviderEnum.STRIPE: {
        const vndPerUsd = await this.exchangeRateService.getVndPerUsd();

        return {
          currency: CurrencyEnum.USD,
          amount: convertVndToUsd(priceVnd, vndPerUsd),
          vndPerUsd,
        };
      }

      default:
        return {
          currency: CurrencyEnum.VND,
          amount: priceVnd,
        };
    }
  }

  async registerUserSubscription(
    userId: string,
    subscriptionId: string,
    provider: PaymentProviderEnum,
  ): Promise<ApiResponse<RegisterUserSubscriptionResponseDto>> {
    const [sub, userSubscriptions, user] = await Promise.all([
      this.subscriptionRepo.get(subscriptionId),
      this.userSubscriptionRepo.getByField({
        userId,
        subscriptionId,
        status: UserSubscriptionStatusEnum.PENDING_ACTIVATION,
      }),
      this.userRepo.get(userId),
    ]);

    if (!sub) {
      throw new NotFoundException({
        code: RESPONSE_CODE.SUBSCRIPTION_NOT_FOUND,
        message: "Subscription not found",
      });
    }

    if (!user) {
      throw new NotFoundException({
        code: RESPONSE_CODE.USER_NOT_FOUND,
        message: "User not found",
      });
    }

    let userSubscription = userSubscriptions[0];
    if (!userSubscription) {
      userSubscription = await this.userSubscriptionRepo.create({
        userId,
        subscriptionId,
        status: UserSubscriptionStatusEnum.PENDING_ACTIVATION,
      });
    }

    const { firstName, lastName } = extractName(user.name);
    const priceVnd = Number(sub.price);
    const { currency, amount, vndPerUsd } = await this.resolvePaymentDetails(
      priceVnd,
      provider,
    );

    const response = await this.paymentService.createTransaction({
      userId,
      order: {
        code: userSubscription.id, // Using user subscription id as order code to easily link payment with subscription, refactor using code for user subscription if needed
        amount,
      },
      redirectUrl: `${this.configService.get("FRONTEND_URL")}/callback/payment/success`,
      cancelUrl: `${this.configService.get("FRONTEND_URL")}/callback/payment/cancel`,
      customer: {
        firstName: firstName,
        lastName: lastName,
        email: user.email || "",
        phone: user.phone || "",
        address: user.address || "",
      },
      currency,
      provider,
    });

    this.logger.log(
      `Created transaction for user ${userId} with subscription ${subscriptionId} 
        and order code: ${userSubscription.id} priceVnd=${priceVnd} vndPerUsd=${vndPerUsd ?? "n/a"} amount=${amount} currency=${currency} response: ${JSON.stringify(response)}`,
    );

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: {
        paymentUrl: response.payment.url,
        qrUrl: response.payment.qr,
      },
    };
  }

  // Update user subscription status to canceled if after a day the payment is not successful, this is a fallback in case we miss any payment webhook event or the user does not complete the payment
  async cancelUserSubscription() {
    // Should using batch update if the number of expired subscriptions is large, for now we can assume it will not be a problem
    const expiredSubscriptions =
      await this.userSubscriptionRepo.getListUserSubscriptions({
        statuses: [UserSubscriptionStatusEnum.PENDING_ACTIVATION],
        fromDate: subDays(new Date(), 1), // Last 24 hours
      });
    for (const sub of expiredSubscriptions) {
      await this.userSubscriptionRepo.updateUserSubscription(sub.id, {
        userId: sub.userId,
        subscriptionId: sub.subscriptionId,
        status: UserSubscriptionStatusEnum.CANCELED,
      });
      this.logger.log(
        `Canceled user subscription with id ${sub.id} due to payment timeout`,
      );
    }
  }
}
