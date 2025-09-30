import { Module } from "@nestjs/common";
import { LoggerServiceModule as LoggerModule } from "@/frameworks/logger-services/logger.module";

@Module({
  imports: [LoggerModule],
  exports: [LoggerModule],
})
export class LoggerServiceModule {}
