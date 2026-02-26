import { ValidationPipe } from "@nestjs/common";
import { getAppConfigs } from "@/common/config";
import fastifyCompress from "@fastify/compress";
import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";

import fastifyMultipart, { FastifyMultipartOptions } from "@fastify/multipart";
import { NestFastifyApplication } from "@nestjs/platform-fastify";

import { type FastifyRequest, type FastifyReply } from "fastify";
import { LoggerMiddleware } from "./logger.middleware";
import { ConfigService } from "@nestjs/config";

// -[TODO]: move to env config
export const CORS_ORIGINS = [
  "http://127.0.0.1:3000",
  "http://127.0.0.1:8000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:8081",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:4000",
  "http://localhost:8080",
  "http://localhost:8081",
  "https://airecruit.software",
  "https://airecruit-frontend.vercel.app",
  "https://airecruit-frontend-git-dev-nhankhtns-projects.vercel.app",
  "https://dev.airecruit.software",
  "https://airecruit-frontend-admin.vercel.app",
  "https://airecruit-frontend-ashen.vercel.app",
  "https://airecruit-frontend-admin-git-dev-nhankhtns-projects.vercel.app",
];

export const enableAppMiddleware = (app: NestFastifyApplication) => {
  const appConfigs = getAppConfigs(app);
  app.register(fastifyCors, {
    origin: CORS_ORIGINS,
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
  app.use((req: FastifyRequest, res: FastifyReply, next: () => void) => {
    loggerMiddleware.use(req, res, next);
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );
  // HttpExceptionFilter is now handled by APP_FILTER provider in app.module.ts
};
