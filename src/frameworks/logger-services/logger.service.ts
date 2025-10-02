import { convertDateToStr } from "@/common/utils/date";
import { Logs } from "@/core/entities/log.entity";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ILoggerServices } from "@/core/abstracts/logger-services.abstract";
import axios from "axios";

@Injectable()
export class LoggerService implements ILoggerServices {
  private readonly logger = new Logger(LoggerService.name);
  constructor(private readonly configService: ConfigService) {}

  async logError(error: Logs) {
    try {
      const environment = this.configService.get<string>("NODE_ENV");
      if (environment === "production" || environment === "development") {
        const discordMessage = {
          text: `🚨 **Error Detected!**\n🔹 **Type:** ${error.type}\n🔹 **Error:** ${error.content}\n🔹 **Note:** ${error.note}\n **Time:** ${convertDateToStr(new Date())}`,
        };

        await axios.post(
          this.configService.get<string>("DISCORD_ERROR_WEBHOOK_URL")!,
          discordMessage,
        );
      }
    } catch (error) {
      this.logger.error(`[LoggerService] [logError] ${error}`);
    }
  }
  async logInfo(info: Logs) {
    try {
      const environment = this.configService.get<string>("NODE_ENV");
      if (environment === "production" || environment === "development") {
        const discordMessage = {
          text: `🔔 **Info Detected!**\n🔹 **Type:** ${info.type}\n🔹 **Info:** ${info.content}\n🔹 **Note:** ${info.note}\n **Time:** ${convertDateToStr(new Date())}`,
        };

        await axios.post(
          this.configService.get<string>("DISCORD_INFO_WEBHOOK_URL")!,
          discordMessage,
        );
      }
    } catch (error) {
      this.logger.error(`[LoggerService] [logInfo] ${error}`);
    }
  }
}
