import { Module } from "@nestjs/common";
import { LoggerService } from "./logger.service";

@Module({
  providers: [
    LoggerService,
    {
      provide: "ILoggerServices",
      useClass: LoggerService,
    },
  ],
  exports: [LoggerService, "ILoggerServices"],
})
export class LoggerServiceModule {}
