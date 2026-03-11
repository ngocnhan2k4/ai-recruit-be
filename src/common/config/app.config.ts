import { ConfigService } from "@nestjs/config";
import { NestFastifyApplication } from "@nestjs/platform-fastify";
import { Environment } from "./env.config";

export interface AppConfigProps {
  name: string;
  port: number;
  globalPrefix: string;
  nodeEnv: Environment;
  corsOrigins: string[];
  swaggerUsername?: string;
  swaggerPassword?: string;
}

export const getAppConfigs = (app: NestFastifyApplication): AppConfigProps => {
  const configService = app.get(ConfigService);
  return {
    name: configService.get<string>("NAME")!,
    port: configService.get<number>("PORT")!,
    globalPrefix: configService.get<string>("GLOBAL_PREFIX")!,
    nodeEnv: configService.get<string>("NODE_ENV")! as Environment,
    corsOrigins: configService.get<string[]>("CORS_ORIGINS") || [],
    swaggerUsername: configService.get<string>("SWAGGER_USERNAME"),
    swaggerPassword: configService.get<string>("SWAGGER_PASSWORD"),
  };
};
