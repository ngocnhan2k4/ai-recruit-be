import { IImportLogRepository, ImportLog } from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { importLogs } from "../models";
import { desc } from "drizzle-orm";

@Injectable()
export class ImportLogRepository
  extends GenericRepository<ImportLog, typeof importLogs>
  implements IImportLogRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, importLogs);
  }

  async getRecentLogs(limit: number = 10): Promise<ImportLog[]> {
    return await this.db
      .select()
      .from(importLogs)
      .orderBy(desc(importLogs.createdAt))
      .limit(limit);
  }
}
