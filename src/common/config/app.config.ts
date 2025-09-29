import { ConfigService } from "@nestjs/config";
import { NestFastifyApplication } from "@nestjs/platform-fastify";

export interface AppConfigProps {
  name: string;
  port: number;
  globalPrefix: string;
  nodeEnv: string;
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
}

export const getAppConfigs = (app: NestFastifyApplication): AppConfigProps => {
  const configService = app.get(ConfigService);
  return {
    name: configService.get<string>("NAME")!,
    port: configService.get<number>("PORT")!,
    globalPrefix: configService.get<string>("GLOBAL_PREFIX")!,
    nodeEnv: configService.get<string>("NODE_ENV")!,
    databaseUrl: configService.get<string>("DATABASE_URL")!,
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
  };
};
