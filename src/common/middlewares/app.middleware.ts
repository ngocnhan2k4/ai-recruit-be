import { ValidationPipe } from "@nestjs/common";
import { getAppConfigs } from "@/common/config/app.config";
import compression from "compression";
import cookieParser from "cookie-parser";
import { NestFastifyApplication } from "@nestjs/platform-fastify";
import { HttpExceptionFilter } from "./http-exception.config";
import { FastifyRequest, FastifyReply } from "fastify";
import { LoggerMiddleware } from "./logger.middleware";
import { ConfigService } from "@nestjs/config";

export const enableAppMiddleware = (app: NestFastifyApplication) => {
  const appConfigs = getAppConfigs(app);

  app.enableCors({
    origin: ["http://localhost:3000"],
    credentials: true,
  });
  app.setGlobalPrefix(appConfigs.globalPrefix);
  app.use(compression({ level: 1 }));
  app.use(cookieParser());

  // Add logger middleware
  const loggerMiddleware = new LoggerMiddleware(new ConfigService());
  app.use((req: FastifyRequest, res: FastifyReply, next: () => void) => {
    loggerMiddleware.use(req, res, next);
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter(appConfigs));
};
