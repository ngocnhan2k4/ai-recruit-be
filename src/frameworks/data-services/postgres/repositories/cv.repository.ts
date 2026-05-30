import { Inject, Injectable, Logger } from "@nestjs/common";
import { cvs } from "../models";
import {
  DBDrizzleTransaction,
  type DBDrizzle,
} from "@/frameworks/data-services/postgres/types";
import { GenericRepository } from "./generic-repository";
import { ICvRepository, Cv, ICacheService, GetListCvFilter } from "@/core";
import { and, count, desc, isNull } from "drizzle-orm";
import { PaginatedResult } from "@/common/types";
import { CACHE_KEYS, SHORT_TTL } from "@/common/constants";
import { cacheWithDedup } from "@/common/utils";

@Injectable()
export class CvRepository
  extends GenericRepository<Cv, typeof cvs>
  implements ICvRepository
{
  private readonly logger = new Logger(CvRepository.name);

  constructor(
    @Inject("DRIZZLE") protected db: DBDrizzle,
    private readonly cacheService: ICacheService,
  ) {
    super(db, cvs);
  }

  get(id: string): Promise<Cv | null> {
    const key = CACHE_KEYS.cv.get(id);
    return cacheWithDedup<Cv | null>(
      key,
      () => this.cacheService.getJson<Cv | null>(key),
      () => super.get(id),
      (data: Cv | null) => this.cacheService.setJson(key, data, SHORT_TTL),
      {
        logger: this.logger,
      },
    );
  }

  async update(
    where: Partial<Cv>,
    item: Partial<Cv>,
    tx?: DBDrizzleTransaction,
  ): Promise<Cv[]> {
    const data = await super.update(where, item, tx);

    const keys: string[] = [];
    for (const cv of data) {
      const keyGet = CACHE_KEYS.cv.get(cv.id);
      keys.push(keyGet);
    }
    await this.cacheService
      .deleteMultipleKeys(keys)
      .catch((err) =>
        this.logger.warn(
          `[cache] Failed to invalidate cache for cv ${keys.join(",")}:`,
          err,
        ),
      );

    return data;
  }

  async delete(where: Partial<Cv>, tx?: DBDrizzleTransaction): Promise<Cv[]> {
    const data = await super.delete(where, tx);

    const keys: string[] = [];
    for (const cv of data) {
      const keyGet = CACHE_KEYS.cv.get(cv.id);
      keys.push(keyGet);
    }
    await this.cacheService
      .deleteMultipleKeys(keys)
      .catch((err) =>
        this.logger.warn(
          `[cache] Failed to invalidate cache for cv ${keys.join(",")}:`,
          err,
        ),
      );

    return data;
  }

  async getCvs(filter: GetListCvFilter): Promise<PaginatedResult<Cv>> {
    const { page = 1, limit } = filter;
    const offset = (page - 1) * limit;
    const [rows, totalRow] = await Promise.all([
      this.db
        .select({
          id: cvs.id,
          userId: cvs.userId,
          name: cvs.name,
          fileUrl: cvs.fileUrl,
          mimeType: cvs.mimeType,
          updatedAt: cvs.updatedAt,
        })
        .from(cvs)
        .where(and(isNull(cvs.deletedAt)))
        .orderBy(desc(cvs.updatedAt))
        .offset(offset)
        .limit(limit),
      !filter?.skipCount
        ? this.db
            .select({ count: count() })
            .from(cvs)
            .where(and(isNull(cvs.deletedAt)))
        : Promise.resolve([]),
    ]);
    const total = Number(totalRow?.[0]?.count ?? 0);
    const hasNext = offset + rows.length < total;
    return {
      data: rows as Cv[],
      pagination: {
        hasNextPage: hasNext,
        total: total,
      },
    };
  }

  async count(): Promise<number> {
    const [{ c }] = await this.db
      .select({ c: count() })
      .from(cvs)
      .where(isNull(cvs.deletedAt));
    return Number(c ?? 0);
  }
}
