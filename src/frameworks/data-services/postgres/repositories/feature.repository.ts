import { Feature, IFeatureRepository } from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { featureTranslation, features } from "../models";
import { GeneralQuery, PaginatedResult } from "@/common/types";
import { and, count, eq, ilike, inArray, isNull, SQL } from "drizzle-orm";

@Injectable()
export class FeatureRepository
  extends GenericRepository<Feature, typeof features>
  implements IFeatureRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, features);
  }

  async getListFeatures(
    query: GeneralQuery,
    requestLanguage = "vi",
    fallbackLanguage = "vi",
  ): Promise<PaginatedResult<Feature>> {
    const limit = query.limit ?? 10;
    const page = query.page ?? 1;
    const keyword = query.keyword ?? "";
    const offset = (page - 1) * limit;

    const whereConditions: SQL[] = [isNull(features.deletedAt)];
    if (keyword) {
      whereConditions.push(ilike(features.name, `%${keyword}%`));
    }

    const [items, totalRow] = await Promise.all([
      this.db
        .select()
        .from(features)
        .where(and(...whereConditions))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: count(features.id) })
        .from(features)
        .where(and(...whereConditions)),
    ]);

    const total = Number(totalRow[0]?.count ?? 0);
    const hasNext = offset + items.length < total;
    const translatedMap = await this.getFeatureTranslationsMap(
      items.map((item) => item.id),
      requestLanguage,
      fallbackLanguage,
    );

    return {
      data: items.map((item) => ({
        ...item,
        name: translatedMap[item.id]?.name || item.name,
        description: translatedMap[item.id]?.description || item.description,
      })),
      pagination: {
        hasNextPage: hasNext,
        total,
      },
    } as PaginatedResult<Feature>;
  }

  async getFeatureByIdWithLanguage(
    id: number,
    requestLanguage = "vi",
    fallbackLanguage = "vi",
  ): Promise<Feature | null> {
    const [feature] = await this.db
      .select()
      .from(features)
      .where(and(eq(features.id, id), isNull(features.deletedAt)))
      .limit(1);

    if (!feature) {
      return null;
    }

    const translatedMap = await this.getFeatureTranslationsMap(
      [feature.id],
      requestLanguage,
      fallbackLanguage,
    );

    return {
      ...feature,
      name: translatedMap[feature.id]?.name || feature.name,
      description:
        translatedMap[feature.id]?.description || feature.description,
    };
  }

  private async getFeatureTranslationsMap(
    featureIds: number[],
    requestLanguage: string,
    fallbackLanguage: string,
  ) {
    if (!featureIds.length) {
      return {} as Record<number, { name: string; description: string | null }>;
    }

    const languagePriority = [requestLanguage, fallbackLanguage].filter(
      (value, index, array) => value && array.indexOf(value) === index,
    );

    if (!languagePriority.length) {
      return {};
    }

    const rows = await this.db
      .select({
        featureId: featureTranslation.featureId,
        languageCode: featureTranslation.languageCode,
        name: featureTranslation.name,
        description: featureTranslation.description,
      })
      .from(featureTranslation)
      .where(
        and(
          inArray(featureTranslation.featureId, featureIds),
          inArray(featureTranslation.languageCode, languagePriority),
        ),
      );

    const map: Record<number, { name: string; description: string | null }> =
      {};
    for (const id of featureIds) {
      const found = rows.find(
        (row) =>
          row.featureId === id && row.languageCode === languagePriority[0],
      );
      const fallback = rows.find(
        (row) =>
          row.featureId === id && row.languageCode === languagePriority[1],
      );
      map[id] = {
        name: found?.name || fallback?.name || "",
        description: found?.description || fallback?.description || null,
      };
    }

    return map;
  }
}
