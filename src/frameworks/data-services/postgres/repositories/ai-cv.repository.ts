import { Inject, Injectable, Logger } from "@nestjs/common";
import { aiCvs } from "../models";
import {
  DBDrizzleTransaction,
  type DBDrizzle,
} from "@/frameworks/data-services/postgres/types";
import { GenericRepository } from "./generic-repository";
import { IAiCvRepository } from "@/core/abstracts/repositories/ai-cv-repository.abstract";
import { AiCv, ICacheService } from "@/core";
import { CACHE_KEYS, SHORT_TTL } from "@/common/constants";
import { cacheWithDedup } from "@/common/utils";

@Injectable()
export class AiCvRepository
  extends GenericRepository<AiCv, typeof aiCvs>
  implements IAiCvRepository
{
  private readonly logger = new Logger(AiCvRepository.name);

  constructor(
    @Inject("DRIZZLE") protected db: DBDrizzle,
    private readonly cacheService: ICacheService,
  ) {
    super(db, aiCvs);
  }

  get(id: string): Promise<AiCv | null> {
    const key = CACHE_KEYS.aiCv.get(id);
    return cacheWithDedup<AiCv | null>(
      key,
      () => this.cacheService.getJson<AiCv | null>(key),
      () => super.get(id),
      (data: AiCv | null) => this.cacheService.setJson(key, data, SHORT_TTL),
      {
        logger: this.logger,
      },
    );
  }

  async update(
    where: Partial<AiCv>,
    item: Partial<AiCv>,
    tx?: DBDrizzleTransaction,
  ): Promise<AiCv[]> {
    const data = await super.update(where, item, tx);

    const keys: string[] = [];
    for (const aiCv of data) {
      const keyGet = CACHE_KEYS.aiCv.get(aiCv.id);
      keys.push(keyGet);
    }
    await this.cacheService
      .deleteMultipleKeys(keys)
      .catch((err) =>
        this.logger.warn(
          `[cache] Failed to invalidate cache for aiCv ${keys.join(",")}:`,
          err,
        ),
      );

    return data;
  }

  async delete(
    where: Partial<AiCv>,
    tx?: DBDrizzleTransaction,
  ): Promise<AiCv[]> {
    const data = await super.delete(where, tx);

    const keys: string[] = [];
    for (const aiCv of data) {
      const keyGet = CACHE_KEYS.aiCv.get(aiCv.id);
      keys.push(keyGet);
    }
    await this.cacheService
      .deleteMultipleKeys(keys)
      .catch((err) =>
        this.logger.warn(
          `[cache] Failed to invalidate cache for aiCv ${keys.join(",")}:`,
          err,
        ),
      );

    return data;
  }
}
