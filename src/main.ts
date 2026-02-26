import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { Logger } from "@nestjs/common";
import { LoggerService } from "@/frameworks/logger-services/logger.service";
import { getAppConfigs } from "./common/config/app.config";
import { enableSwaggerDoc } from "./common/config/swagger.config";
import { enableAppMiddleware } from "./common/middlewares/app.middleware";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  const logger = new Logger(bootstrap.name);
  const { port, globalPrefix } = getAppConfigs(app);

  try {
    // app.get will return the provider instance if it is available in DI
    // Note: if the provider is not yet available this will throw; we catch
    // and ignore to fallback to console logging.
    globalLoggerService = app.get(LoggerService);
  } catch (e) {
    this.logger.error("[main] [bootstrap] Failed to get LoggerService", e);
  }

  enableSwaggerDoc(app);
  enableAppMiddleware(app);

  await app.listen(port, "0.0.0.0", () => {
    app.getUrl().then((url) => {
      const serverUrl = url.replace("[::1]", "localhost");
      logger.log(`Server is running on ${serverUrl}`);
      logger.log(`APIs is running on ${serverUrl + globalPrefix}`);
      logger.log(`Swagger docs is running on ${serverUrl}/docs`);
    });
  });
}
process.on("unhandledRejection", (reason) => {
  handleError("unhandledRejection", reason);
});

process.on("uncaughtException", (error) => {
  handleError("uncaughtException", error);
});

let globalLoggerService: LoggerService | null = null;

function handleError(type: string, error: any) {
  try {
    if (globalLoggerService) {
      globalLoggerService
        .logError({
          type,
          content: JSON.stringify(error),
          note: "It caused server crashes",
        })
        .catch((e) =>
          console.error(
            "[main] [handleError]",
            "Failed to send error to logger service",
            e,
          ),
        );
    } else {
      console.error("[main] [handleError]", type, error);
    }
  } catch (e) {
    // As a last resort, print to stderr
    console.error("[main] [handleError]", type, error);
    console.error("[main] [handleError] Error while handling error:", e);
  }
}
bootstrap();
