// IMPORTANT: instrument.ts must be imported before everything else so Sentry
// can instrument all modules (NestJS, database, HTTP, etc.) at startup.
import "./instrument";
import * as Sentry from "@sentry/nestjs";
import * as dns from "dns";
dns.setDefaultResultOrder("ipv4first");

import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { Logger } from "@nestjs/common";
import { getAppConfigs } from "./common/config/app.config";
import { enableSwaggerDoc } from "./common/config/swagger.config";
import { enableAppMiddleware } from "./common/middlewares/app.middleware";
import { loadVaultIntoEnv } from "./common/config";
import { RequestContextLogger } from "./common/logger/request-context.logger";

async function bootstrap() {
  await loadVaultIntoEnv();
  const { AppModule } = await import("./app.module.js");
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      maxParamLength: 256,
    }),
    {
      logger: new RequestContextLogger(),
    },
  );
  const logger = new Logger(bootstrap.name);
  const { port, globalPrefix } = getAppConfigs(app);

  enableAppMiddleware(app);
  enableSwaggerDoc(app);

  await app.listen(port, "0.0.0.0", () => {
    app.getUrl().then((url) => {
      const serverUrl = url.replace("[::1]", "localhost");
      logger.log(`Server is running on ${serverUrl}`);
      logger.log(`APIs is running on ${serverUrl + globalPrefix}`);
      logger.log(`Swagger docs is running on ${serverUrl}${globalPrefix}/docs`);
    });
  });
}
process.on("unhandledRejection", (reason) => {
  handleError("unhandledRejection", reason);
});

process.on("uncaughtException", (error) => {
  handleError("uncaughtException", error);
});

function handleError(type: string, error: unknown) {
  console.error(`[main] fatal ${type}:`, error);
  Sentry.captureException(error, { tags: { fatal: type } });
  // Give Sentry a moment to flush before the process may exit.
  void Sentry.flush(2000);
}
bootstrap();
