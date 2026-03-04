import { IAreaRepository, Area } from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { areas } from "../models";
import { GeneralQuery, PaginatedResult } from "@/common/types";
import { count, ilike, and, SQL } from "drizzle-orm";

@Injectable()
export class AreaRepository
  extends GenericRepository<Area, typeof areas>
  implements IAreaRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, areas);
  }

  async getPaginatedAreas(query: GeneralQuery): Promise<PaginatedResult<Area>> {
    const limit = Math.max(query.limit ?? 20, 1);
    const page = Math.max(query.page ?? 1, 1);
    const keyword = query.keyword ?? "";

    const whereConditions: SQL[] = [];

    if (keyword) {
      whereConditions.push(ilike(areas.name, `%${keyword}%`));
    }

    const offset = (page - 1) * limit;

    const items = await this.db
      .select()
      .from(areas)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .limit(limit)
      .offset(offset);

    const totalRow = await this.db
      .select({ count: count(areas.id) })
      .from(areas)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);
    const total = Number(totalRow[0]?.count ?? 0);

    const hasNext = offset + items.length < total;

    return {
      data: items,
      pagination: {
        hasNextPage: hasNext,
        total,
      },
    } as PaginatedResult<Area>;
  }
}
