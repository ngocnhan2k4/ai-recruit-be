import { AppConfigProps, Environment, getAppConfigs } from "@/common/config";
import { NestFastifyApplication } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import fastifyBasicAuth from "@fastify/basic-auth";

const tags: string[] = ["Users", "File Upload"];

const generateTags = (tags: string[]) => {
  return tags.map((tag) => {
    return {
      name: tag,
      description: `All APIs to interact with ${tag.toLowerCase()}`,
    };
  });
};

export const generateDocumentBuilder = ({ name }: AppConfigProps) => {
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
  // if (nodeEnv === Environment.Development) {
  //   urls.forEach((url, index) => {
  //     document.addServer(
  //       `https://${url}${globalPrefix}`,
  //       `Development server ${index + 1}`,
  //     );
  //   });
  // } else if (nodeEnv === Environment.Local) {
  //   urls.forEach((url, index) => {
  //     document.addServer(
  //       `http://${url}:${port}${globalPrefix}`,
  //       `Local server ${index + 1}`,
  //     );
  //   });
  // } else {
  //   urls.forEach((url, index) => {
  //     if (url.includes("https")) {
  //       document.addServer(
  //         `${url}${globalPrefix}`,
  //         `Production server ${index + 1}`,
  //       );
  //     } else {
  //       document.addServer(
  //         `http://${url}:${port}${globalPrefix}`,
  //         `Production server ${index + 1}`,
  //       );
  //     }
  //   });
  // }
  return document.build();
};

export const enableSwaggerDoc = async (app: NestFastifyApplication) => {
  const appConfigs = getAppConfigs(app);

  if (appConfigs.nodeEnv === Environment.Production) return;

  if (appConfigs.nodeEnv !== Environment.Local) {
    const fastify = app.getHttpAdapter().getInstance();
    await fastify.register(fastifyBasicAuth, {
      validate: async (username, password, _req, _reply) => {
        if (
          username !== appConfigs.swaggerUsername ||
          password !== appConfigs.swaggerPassword
        ) {
          throw new Error("Unauthorized");
        }
      },
      authenticate: true,
    });

    fastify.addHook("onRequest", fastify.basicAuth);
  }

  const swaggerConfig = generateDocumentBuilder(appConfigs);
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup("docs", app, document, {
    jsonDocumentUrl: "docs/json",
    swaggerOptions: {
      persistAuthorization: true,
    },
    useGlobalPrefix: true,
  });
};
