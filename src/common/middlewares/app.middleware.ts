import { Logger, ValidationPipe } from "@nestjs/common";
import { getAppConfigs } from "@/common/config";
import fastifyCompress from "@fastify/compress";
import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyMultipart, { FastifyMultipartOptions } from "@fastify/multipart";
import { NestFastifyApplication } from "@nestjs/platform-fastify";

import { FastifyRequest, FastifyReply } from "fastify";
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

export const enableAppMiddleware = async (app: NestFastifyApplication) => {
  const appConfigs = getAppConfigs(app);
  const logger = new Logger("RateLimit");

  app.register(fastifyCors, {
    origin: CORS_ORIGINS,
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    exposedHeaders: ["Set-Cookie"],
  });

  // Global rate limit: 200 req / minute / IP
  await app.register(fastifyRateLimit, {
    max: 200,
    timeWindow: "1 minute",
    keyGenerator: (req: FastifyRequest) => req.ip,
    errorResponseBuilder: (_req: FastifyRequest, context) => ({
      code: 429,
      message: `Too many requests. Rate limit: ${context.max} per ${context.after}. Please try again later.`,
      data: null,
    }),
    onExceeding: (req: FastifyRequest) => {
      logger.warn(`Rate limit approaching: ${req.ip} ${req.method} ${req.url}`);
    },
    onExceeded: (req: FastifyRequest) => {
      logger.error(`Rate limit exceeded: ${req.ip} ${req.method} ${req.url}`);
    },
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
