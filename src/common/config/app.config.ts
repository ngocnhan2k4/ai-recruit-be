import { ConfigService } from "@nestjs/config";
import { NestFastifyApplication } from "@nestjs/platform-fastify";
import { Environment } from "./env.config";

export interface AppConfigProps {
  name: string;
  port: number;
  globalPrefix: string;
  databaseUrl: string;
  jwtSecret: string;
  firebaseProjectId: string;
  firebaseClientEmail: string;
  firebasePrivateKey: string;
  jwtExpiresIn: string;
  refreshExpiresIn: number;
  firebaseStorageBucket: string;
  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
  cloudinaryApiSecret: string;
  nodeEnv: Environment;
  databaseAdapterUrl: string;
}

export const getAppConfigs = (app: NestFastifyApplication): AppConfigProps => {
  const configService = app.get(ConfigService);
  return {
    name: configService.get<string>("NAME")!,
    port: configService.get<number>("PORT")!,
    globalPrefix: configService.get<string>("GLOBAL_PREFIX")!,
    databaseUrl: configService.get<string>("DATABASE_URL")!,
    databaseAdapterUrl: configService.get<string>("DATABASE_ADAPTER_URL")!,
    jwtSecret: configService.get<string>("JWT_SECRET")!,
    firebaseProjectId: configService.get<string>("FIREBASE_PROJECT_ID")!,
    firebaseClientEmail: configService.get<string>("FIREBASE_CLIENT_EMAIL")!,
    firebasePrivateKey: configService.get<string>("FIREBASE_PRIVATE_KEY")!,
    jwtExpiresIn: configService.get<string>("JWT_EXPIRES_IN")!,
    refreshExpiresIn: configService.get<number>("REFRESH_EXPIRES_IN")!,
    firebaseStorageBucket: configService.get<string>(
      "FIREBASE_STORAGE_BUCKET",
    )!,
    cloudinaryCloudName: configService.get<string>("CLOUDINARY_CLOUD_NAME")!,
    cloudinaryApiKey: configService.get<string>("CLOUDINARY_API_KEY")!,
    cloudinaryApiSecret: configService.get<string>("CLOUDINARY_API_SECRET")!,
    nodeEnv: configService.get<string>("NODE_ENV")! as Environment,
  };
};
