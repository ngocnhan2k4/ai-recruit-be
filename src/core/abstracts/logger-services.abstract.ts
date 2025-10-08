import { Logs } from "../entities/log.entity";

export abstract class ILoggerServices {
  abstract logInfo(message: Logs): Promise<void>;
  abstract logError(error: Logs): Promise<void>;
}
