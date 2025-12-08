import { ImportLog } from "@/core";
import { IGenericRepository } from "./generic-repository.abstract";

export abstract class IImportLogRepository extends IGenericRepository<ImportLog> {
  abstract getRecentLogs(limit?: number): Promise<ImportLog[]>;
}
