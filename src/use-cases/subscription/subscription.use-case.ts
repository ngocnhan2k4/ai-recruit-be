import {
  BadRequestException,
  Injectable,
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
} from "@/interfaces/dtos/subscription";
import {
  IFeatureRepository,
  ISubscriptionRepository,
  Subscription,
  UserSubscription,
} from "@/core";
import { IUserSubscriptionRepository } from "@/core/abstracts/repositories/user-subscription-repository.abstract";
import { PaginatedResult } from "@/common/types";
import { GetListSubscriptionResponse } from "@/core/entities/subscription.entity";

@Injectable()
export class SubscriptionUseCases {
  constructor(
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly userSubscriptionRepo: IUserSubscriptionRepository,
    private readonly featureRepo: IFeatureRepository,
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
}
