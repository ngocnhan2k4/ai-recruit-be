import { Module } from "@nestjs/common";
import { LoggerService } from "./logger.service";
import { ILoggerServices } from "@/core/abstracts/logger-services.abstract";

@Module({
  providers: [
    LoggerService,
    {
      provide: ILoggerServices,
      useClass: LoggerService,
    },
  ],
  exports: [ILoggerServices],
})
export class LoggerServiceModule {}
