import { Injectable, NotFoundException } from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants";
import { ApiResponse } from "@/interfaces/dtos";
import {
  CreateFeatureRequestDto,
  UpdateFeatureRequestDto,
} from "@/interfaces/dtos/feature";
import { Feature, IFeatureRepository } from "@/core";
import { GeneralQuery, PaginatedResult } from "@/common/types";

@Injectable()
export class FeatureUseCases {
  constructor(
    @Inject(IFeatureRepository)
    private readonly featureRepo: IFeatureRepository,
  ) {}

  async createFeature(
    dto: CreateFeatureRequestDto,
  ): Promise<ApiResponse<Feature>> {
    const created = await this.featureRepo.create({
      code: dto.code,
      name: dto.name,
      description: dto.description ?? null,
    });

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: created,
    };
  }

  async updateFeature(
    id: number,
    dto: UpdateFeatureRequestDto,
  ): Promise<ApiResponse<Feature>> {
    const [updated] = await this.featureRepo.update({ id }, dto);

    if (!updated) {
      throw new NotFoundException({
        code: RESPONSE_CODE.FEATURE_NOT_FOUND,
        message: "Feature not found",
      });
    }

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: updated,
    };
  }

  async deleteFeature(id: number): Promise<ApiResponse<Feature>> {
    const [deleted] = await this.featureRepo.delete({ id } as any);

    if (!deleted) {
      throw new NotFoundException({
        code: RESPONSE_CODE.FEATURE_NOT_FOUND,
        message: "Feature not found",
      });
    }

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: deleted,
    };
  }

  async getFeatures(
    query: GeneralQuery,
  ): Promise<ApiResponse<PaginatedResult<Feature>>> {
    const result = await this.featureRepo.getListFeatures(query);

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: result,
    };
  }

  async getFeatureById(id: number): Promise<ApiResponse<Feature>> {
    const existing = await this.featureRepo.getFeatureById(id);
    if (!existing) {
      throw new NotFoundException({
        code: RESPONSE_CODE.FEATURE_NOT_FOUND,
        message: "Feature not found",
      });
    }

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: existing,
    };
  }
}
