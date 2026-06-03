import {
  BadRequestException,
  Inject,
  Injectable,
  ForbiddenException,
} from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import type { TokenPayload } from "@/common/types";
import {
  LLONG_TTL,
  RESPONSE_CODE,
  RESPONSE_MESSAGE,
  RoleEnum,
} from "@/common/constants";
import {
  normalizeLanguageCode,
  parseSupportedLanguageCode,
} from "@/common/utils";
import { ICacheService } from "@/core/abstracts/cache.abstract";
import type { DBDrizzle } from "@/frameworks/data-services/postgres/types";
import {
  comments,
  feedbacks,
} from "@/frameworks/data-services/postgres/models";
import { GoogleTranslationService } from "@/frameworks/translation/google-translation.service";
import type { ApiResponse } from "@/interfaces/dtos";
import {
  LazyTranslationEntityType,
  TranslateContentRequestDto,
  TranslateContentResponseDto,
} from "@/interfaces/dtos/translation";

@Injectable()
export class TranslationUseCase {
  constructor(
    @Inject("DRIZZLE") private readonly db: DBDrizzle,
    private readonly cacheService: ICacheService,
    private readonly googleTranslationService: GoogleTranslationService,
  ) {}

  async translate(
    dto: TranslateContentRequestDto,
    acceptLanguage?: string,
    user?: TokenPayload,
  ): Promise<ApiResponse<TranslateContentResponseDto>> {
    const explicitTargetLanguage = dto.targetLanguage?.trim();
    const parsedExplicitTargetLanguage = explicitTargetLanguage
      ? parseSupportedLanguageCode(explicitTargetLanguage)
      : null;

    if (explicitTargetLanguage && !parsedExplicitTargetLanguage) {
      throw new BadRequestException(
        `Unsupported target language: ${dto.targetLanguage}`,
      );
    }

    const targetLanguage =
      parsedExplicitTargetLanguage || normalizeLanguageCode(acceptLanguage);

    const source = await this.getSourceText(dto, user);
    const sourceLanguage = normalizeLanguageCode(source.languageCode);

    if (sourceLanguage === targetLanguage) {
      return {
        code: RESPONSE_CODE.SUCCESS,
        message: RESPONSE_MESSAGE.SUCCESS,
        data: {
          entityType: dto.entityType,
          entityId: dto.entityId,
          field: dto.field,
          sourceLanguage,
          targetLanguage,
          translatedText: source.text,
          fromCache: true,
        },
      };
    }

    const cacheKey = this.buildCacheKey(
      dto.entityType,
      dto.entityId,
      dto.field,
      sourceLanguage,
      targetLanguage,
    );
    const cached =
      await this.cacheService.getJson<TranslateContentResponseDto>(cacheKey);

    if (cached?.translatedText) {
      return {
        code: RESPONSE_CODE.SUCCESS,
        message: RESPONSE_MESSAGE.SUCCESS,
        data: { ...cached, fromCache: true },
      };
    }

    const translated = await this.googleTranslationService.translateText({
      text: source.text,
      sourceLanguage,
      targetLanguage,
    });

    const payload: TranslateContentResponseDto = {
      entityType: dto.entityType,
      entityId: dto.entityId,
      field: dto.field,
      sourceLanguage,
      targetLanguage,
      translatedText: translated.translatedText,
      fromCache: false,
    };

    await this.cacheService.setJson(cacheKey, payload, LLONG_TTL);

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: payload,
    };
  }

  private async getSourceText(
    dto: TranslateContentRequestDto,
    user?: TokenPayload,
  ): Promise<{ text: string; languageCode: string }> {
    switch (dto.entityType) {
      case LazyTranslationEntityType.COMMENT:
        return this.getCommentText(dto.entityId, dto.field);
      case LazyTranslationEntityType.FEEDBACK:
      default:
        throw new BadRequestException("Unsupported translation entity type");
  }

  private async getCommentText(entityId: string, field: string) {
    if (field !== "content") {
      throw new ForbiddenException(
        "Only content field is allowed for comment translation",
      );
    }

    const [comment] = await this.db
      .select({
        content: comments.content,
        languageCode: comments.languageCode,
      })
      .from(comments)
      .where(and(eq(comments.id, entityId), isNull(comments.deletedAt)))
      .limit(1);

    if (!comment) {
      throw new ForbiddenException("Comment not found");
    }

    return { text: comment.content, languageCode: comment.languageCode };
  }

  private async getFeedbackText(
    entityId: string,
    field: string,
    user?: TokenPayload,
  ) {
    if (!user) {
      throw new UnauthorizedException("Unauthorized");
    }

    const [feedback] = await this.db
      .select({
        subject: feedbacks.subject,
        message: feedbacks.message,
        languageCode: feedbacks.languageCode,
        userId: feedbacks.userId,
      })
      .from(feedbacks)
      .where(and(eq(feedbacks.id, entityId), isNull(feedbacks.deletedAt)))
      .limit(1);

    if (!feedback) {
      throw new ForbiddenException("Feedback not found");
    }

    const isPrivileged = user.roles.some((role) =>
      [RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.MODERATOR].includes(role),
    );
    const isOwner = feedback.userId === user.userId;
    if (!isPrivileged && !isOwner) {
      throw new ForbiddenException("You do not have permission");
    }

    if (!["subject", "message"].includes(field)) {
      throw new ForbiddenException(
        "Only subject/message fields are allowed for feedback translation",
      );
    }

    return {
      text: field === "subject" ? feedback.subject : feedback.message,
      languageCode: feedback.languageCode,
    };
  }

  private buildCacheKey(
    entityType: LazyTranslationEntityType,
    entityId: string,
    field: string,
    sourceLanguage: string,
    targetLanguage: string,
  ) {
    return [
      "lazy-translation",
      entityType,
      entityId,
      field,
      sourceLanguage,
      targetLanguage,
    ].join(":");
  }
}
