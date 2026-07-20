import { NestFactory } from "@nestjs/core";
import { SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "../../src/app.module";
import { getAppConfigs } from "../../src/common/config/app.config";
import { generateDocumentBuilder } from "../../src/common/config/swagger.config";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import * as fs from "fs";
import * as path from "path";

async function generateSwaggerJson() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  const appConfigs = getAppConfigs(app);
  const swaggerConfig = generateDocumentBuilder(appConfigs);
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  // Create output directory if it doesn't exist
  const outputDir = path.join(process.cwd(), "docs");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write JSON file
  const outputPath = path.join(outputDir, "swagger.json");
  fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));

  console.log(`✅ Swagger JSON generated successfully at: ${outputPath}`);
  console.log(
    `📄 File size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`,
  );

  await app.close();
}

generateSwaggerJson()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error generating Swagger JSON:", error);
    process.exit(1);
  });
