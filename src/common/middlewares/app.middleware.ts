import { ValidationPipe } from "@nestjs/common";
import { getAppConfigs } from "@/common/config";

import fastifyCompress from "@fastify/compress";
import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";

import fastifyMultipart, { FastifyMultipartOptions } from "@fastify/multipart";
import { NestFastifyApplication } from "@nestjs/platform-fastify";

export const enableAppMiddleware = async (app: NestFastifyApplication) => {
  const appConfigs = getAppConfigs(app);
  await app.register(fastifyCors, {
    origin: appConfigs.corsOrigins,
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie", "x-request-id"],
    exposedHeaders: ["Set-Cookie", "x-request-id"],
  });

  app.setGlobalPrefix(appConfigs.globalPrefix);

  await app.register(fastifyCompress, {
    global: true,
    threshold: 1024,
    encodings: ["gzip", "deflate", "br"],
  });
  await app.register(fastifyCookie);

  // Register multipart support for file uploads
  const multipartOptions: FastifyMultipartOptions = {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  };
  await app.register(fastifyMultipart, multipartOptions);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );
  // HttpExceptionFilter is now handled by APP_FILTER provider in app.module.ts
};
