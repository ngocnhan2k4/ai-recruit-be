import { Logs } from "../entities/logs.entity";

export abstract class ILoggerServices {
  abstract logInfo(message: Logs): Promise<void>;
  abstract logError(error: Logs): Promise<void>;
}
