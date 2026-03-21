import { Feature, IFeatureRepository } from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { features } from "../models";
import { GeneralQuery, PaginatedResult } from "@/common/types";
import { and, count, ilike, isNull, SQL } from "drizzle-orm";

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

    return {
      data: items,
      pagination: {
        hasNextPage: hasNext,
        total,
      },
    } as PaginatedResult<Feature>;
  }
}
