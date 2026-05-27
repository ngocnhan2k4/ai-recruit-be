import { Injectable, NotFoundException } from "@nestjs/common";
import { Inject } from "@nestjs/common";
import {
  RESPONSE_CODE,
  RESPONSE_MESSAGE,
  TranslationJobType,
  TRANSLATION_SUPPORTED_LANGUAGES,
} from "@/common/constants";
import { ApiResponse } from "@/interfaces/dtos";
import {
  CreateFeatureRequestDto,
  UpdateFeatureRequestDto,
} from "@/interfaces/dtos/feature";
import { Feature, IFeatureRepository } from "@/core";
import { GeneralQuery, PaginatedResult } from "@/common/types";
import { IMessageQueueService } from "@/core/abstracts/message-queue.abstract";
import { DEFAULT_LANGUAGE_CODE, normalizeLanguageCode } from "@/common/utils";

@Injectable()
export class FeatureUseCases {
  constructor(
    @Inject(IFeatureRepository)
    private readonly featureRepo: IFeatureRepository,
    private readonly messageQueueService: IMessageQueueService,
  ) {}

  private resolveTranslationTargets(sourceLanguage: string) {
    return TRANSLATION_SUPPORTED_LANGUAGES.filter(
      (language) => language !== sourceLanguage,
    );
  }

  private async enqueueFeatureTranslation(
    featureId: number,
    sourceLanguage: string,
  ) {
    const targetLanguages = this.resolveTranslationTargets(sourceLanguage);
    if (!targetLanguages.length) {
      return;
    }

    await this.messageQueueService.addTranslation(TranslationJobType.FEATURE, {
      featureId,
      sourceLanguage,
      targetLanguages,
    });
  }

  async createFeature(
    dto: CreateFeatureRequestDto,
    acceptLanguage?: string,
  ): Promise<ApiResponse<Feature>> {
    const sourceLanguage = normalizeLanguageCode(acceptLanguage);
    const created = await this.featureRepo.create({
      code: dto.code,
      name: dto.name,
      description: dto.description ?? null,
    });
    await this.enqueueFeatureTranslation(created.id, sourceLanguage);

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: created,
    };
  }

  async updateFeature(
    id: number,
    dto: UpdateFeatureRequestDto,
    acceptLanguage?: string,
  ): Promise<ApiResponse<Feature>> {
    const sourceLanguage = normalizeLanguageCode(acceptLanguage);
    const [updated] = await this.featureRepo.update({ id }, dto);

    if (!updated) {
      throw new NotFoundException({
        code: RESPONSE_CODE.FEATURE_NOT_FOUND,
        message: "Feature not found",
      });
    }
    await this.enqueueFeatureTranslation(updated.id, sourceLanguage);

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
    acceptLanguage?: string,
  ): Promise<ApiResponse<PaginatedResult<Feature>>> {
    const lang = normalizeLanguageCode(acceptLanguage);
    const result = await this.featureRepo.getListFeatures(
      query,
      lang,
      DEFAULT_LANGUAGE_CODE,
    );

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: result,
    };
  }

  async getFeatureById(
    id: number,
    acceptLanguage?: string,
  ): Promise<ApiResponse<Feature>> {
    const lang = normalizeLanguageCode(acceptLanguage);
    const existing = await this.featureRepo.getFeatureByIdWithLanguage(
      id,
      lang,
      DEFAULT_LANGUAGE_CODE,
    );
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
