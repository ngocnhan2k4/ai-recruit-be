import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { Logger } from "@nestjs/common";
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

  enableSwaggerDoc(app);
  enableAppMiddleware(app);

  await app.listen(port, () => {
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
// [TODO]: log error here
const handleError = (type: string, error: any) => {
  console.error(type, error);
};
bootstrap();
