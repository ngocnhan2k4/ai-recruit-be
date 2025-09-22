import { ValidationPipe } from "@nestjs/common";
import { getAppConfigs } from "@/common/config/app.config";
import compression from "compression";
import cookieParser from "cookie-parser";
import { NestFastifyApplication } from "@nestjs/platform-fastify";

export const enableAppMiddleware = (app: NestFastifyApplication) => {
  const appConfigs = getAppConfigs(app);

  app.enableCors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  });
  app.setGlobalPrefix(appConfigs.globalPrefix);
  app.use(compression({ level: 1 }));
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );
};
