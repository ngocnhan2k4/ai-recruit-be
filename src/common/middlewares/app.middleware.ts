import { ValidationPipe } from "@nestjs/common";
import { getAppConfigs } from "@/common/config";

import fastifyCompress from "@fastify/compress";
import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";

import fastifyMultipart, { FastifyMultipartOptions } from "@fastify/multipart";
import { NestFastifyApplication } from "@nestjs/platform-fastify";

import { LoggerMiddleware } from "./logger.middleware";
import { ConfigService } from "@nestjs/config";

export const enableAppMiddleware = (app: NestFastifyApplication) => {
  const appConfigs = getAppConfigs(app);
  app.register(fastifyCors, {
    origin: appConfigs.corsOrigins,
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    exposedHeaders: ["Set-Cookie"],
  });

  app.setGlobalPrefix(appConfigs.globalPrefix);

  // Use Fastify-native compression to avoid response/body issues in browsers
  app.register(fastifyCompress, { global: true });
  app.register(fastifyCookie);

  // Register multipart support for file uploads
  const multipartOptions: FastifyMultipartOptions = {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  };
  app.register(fastifyMultipart, multipartOptions);

  // Add logger middleware
  const loggerMiddleware = new LoggerMiddleware(new ConfigService());
  app.use(loggerMiddleware.use.bind(loggerMiddleware));

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );
  // HttpExceptionFilter is now handled by APP_FILTER provider in app.module.ts
};
