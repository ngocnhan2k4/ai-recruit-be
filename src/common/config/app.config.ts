import { ConfigService } from "@nestjs/config";
import { NestFastifyApplication } from "@nestjs/platform-fastify";

export interface AppConfigProps {
  name: string;
  port: number;
  globalPrefix: string;
  nodeEnv: string;
}

export const getAppConfigs = (app: NestFastifyApplication): AppConfigProps => {
  const configService = app.get(ConfigService);
  return {
    name: configService.get<string>("NAME")!,
    port: configService.get<number>("PORT")!,
    globalPrefix: configService.get<string>("GLOBAL_PREFIX")!,
    nodeEnv: configService.get<string>("NODE_ENV")!,
  };
};
