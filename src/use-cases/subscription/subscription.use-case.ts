import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants";
import { ApiResponse } from "@/interfaces/dtos";
import {
  CreateSubscriptionRequestDto,
  UpdateSubscriptionRequestDto,
  UpsertSubscriptionFeaturesRequestDto,
} from "@/interfaces/dtos/subscription";
import {
  IFeatureRepository,
  ISubscriptionRepository,
  Subscription,
  UserSubscription,
} from "@/core";
import { GeneralQuery, PaginatedResult } from "@/common/types";
import { UserSubscriptionFilter } from "@/core/entities/subscription.entity";

@Injectable()
export class SubscriptionUseCases {
  constructor(
    @Inject(ISubscriptionRepository)
    private readonly subscriptionRepo: ISubscriptionRepository,
    @Inject(IFeatureRepository)
    private readonly featureRepo: IFeatureRepository,
  ) {}

  async createSubscription(
    dto: CreateSubscriptionRequestDto,
  ): Promise<ApiResponse<Subscription>> {
    const created = await this.subscriptionRepo.create({
      name: dto.name as "FREE" | "BASIC" | "PRO" | "ENTEPRISE" | undefined,
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
        name: dto.name as "FREE" | "BASIC" | "PRO" | "ENTEPRISE" | undefined,
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
    query: GeneralQuery,
  ): Promise<ApiResponse<PaginatedResult<Subscription>>> {
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

  async getUserSubscriptions(
    query: UserSubscriptionFilter,
  ): Promise<ApiResponse<PaginatedResult<UserSubscription>>> {
    const result = await this.subscriptionRepo.getListUserSubscriptions(query);

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: result,
    };
  }
}
