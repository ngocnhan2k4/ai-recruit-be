import { AppConfigProps, getAppConfigs } from "@/common/config/app.config";
import { NestFastifyApplication } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

const tags: string[] = ["Users", "File Upload"];
const developmentUrls: string[] = ["localhost", "airecruit.software"];
const productionUrls: string[] = [];

const generateTags = (tags: string[]) => {
  return tags.map((tag) => {
    return {
      name: tag,
      description: `All APIs to interact with ${tag.toLowerCase()}`,
    };
  });
};

export const generateDocumentBuilder = ({
  name,
  port,
  nodeEnv,
  globalPrefix,
}: AppConfigProps) => {
  const document = new DocumentBuilder()
    .setTitle(`${name} Documentation`)
    .setDescription("This is the API Docs for using internally.")
    .setVersion("1.0")
    .setTermsOfService("http://swagger.io/terms/")
    .setLicense("MIT License", "https://opensource.org/license/mit")
    .setExternalDoc("Find out more about Swagger", "http://swagger.io")
    .addBearerAuth();
  generateTags(tags).forEach((tag) =>
    document.addTag(tag.name, tag.description),
  );
  if (nodeEnv === "development") {
    developmentUrls.forEach((url, index) => {
      const scheme = url === "localhost" ? "http" : "https";
      const domain = url === "localhost" ? `${url}:${port}` : url;
      document.addServer(
        `${scheme}://${domain}${globalPrefix}`,
        `Development server ${index + 1}`,
      );
    });
  } else {
    productionUrls.forEach((url, index) => {
      if (url.includes("https")) {
        document.addServer(
          `${url}${globalPrefix}`,
          `Production server ${index + 1}`,
        );
      } else {
        document.addServer(
          `http://${url}:${port}${globalPrefix}`,
          `Production server ${index + 1}`,
        );
      }
    });
  }
  return document.build();
};

export const enableSwaggerDoc = (app: NestFastifyApplication) => {
  const appConfigs = getAppConfigs(app);
  const swaggerConfig = generateDocumentBuilder(appConfigs);
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup("docs", app, document, {
    jsonDocumentUrl: "docs/json",
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
};
