import { ValidationPipe } from "@nestjs/common";
import { getAppConfigs } from "@/common/config/app.config";
import fastifyCompress from "@fastify/compress";
import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import { NestFastifyApplication } from "@nestjs/platform-fastify";
import { HttpExceptionFilter } from "./http-exception.config";
import { FastifyRequest, FastifyReply } from "fastify";
import { LoggerMiddleware } from "./logger.middleware";
import { ConfigService } from "@nestjs/config";

export const enableAppMiddleware = (app: NestFastifyApplication) => {
  const appConfigs = getAppConfigs(app);

  // Register Fastify CORS plugin with permissive settings for development
  app.register(fastifyCors, {
    origin: ["http://127.0.0.1:3000", "http://127.0.0.1:8000"], // Allow all origins in development
    credentials: true, // Disable credentials for simpler CORS
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["*"], // Allow all headers
  });

  app.setGlobalPrefix(appConfigs.globalPrefix);

  // Use Fastify-native compression to avoid response/body issues in browsers
  app.register(fastifyCompress, { global: true });
  app.register(fastifyCookie);

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
