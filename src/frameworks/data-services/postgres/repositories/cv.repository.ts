import { Inject, Injectable } from "@nestjs/common";
import { cvs } from "../models";
import { type DBDrizzle } from "@/frameworks/data-services/postgres/types";
import { GenericRepository } from "./generic-repository";
import { ICvRepository, Cv } from "@/core";
import { and, count, desc, isNull } from "drizzle-orm";
import { GeneralQuery } from "@/common/types";

@Injectable()
export class CvRepository
  extends GenericRepository<Cv, typeof cvs>
  implements ICvRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, cvs);
  }

  async getCvs(
    query: GeneralQuery,
  ): Promise<
    Array<
      Pick<Cv, "id" | "userId" | "name" | "fileUrl" | "mimeType" | "updatedAt">
    >
  > {
    const { page = 1, limit } = query;
    const offset = (page - 1) * limit;
    const rows = await this.db
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
      .limit(limit);
    return rows as any;
  }

  async count(): Promise<number> {
    const [{ c }] = await this.db
      .select({ c: count() })
      .from(cvs)
      .where(isNull(cvs.deletedAt));
    return Number(c ?? 0);
  }
}
