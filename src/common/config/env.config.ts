import { Transform, plainToClass } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  validateSync,
} from "class-validator";

export enum Environment {
  Local = "local",
  Development = "development",
  Production = "production",
}

export class EnvironmentVariables {
  @IsOptional()
  @IsString()
  NAME: string = "AI Recruit";

  @IsOptional()
  @IsNumber()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  PORT: number = 8000;

  @IsOptional()
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Local;

  @IsOptional()
  @IsString()
  GLOBAL_PREFIX: string = "/api/v1";

  @IsString()
  DATABASE_URL: string;

  @IsString()
  DATABASE_ADAPTER_URL: string;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  FIREBASE_PROJECT_ID: string;

  @IsString()
  FIREBASE_CLIENT_EMAIL: string;

  @IsString()
  FIREBASE_PRIVATE_KEY: string;

  @IsString()
  JWT_EXPIRES_IN: string;

  @IsNumber()
  REFRESH_EXPIRES_IN: number;

  // @IsString()
  // REDIS_HOST: string;

  // @IsNumber()
  // REDIS_PORT: number;

  // @IsString()
  // REDIS_PASSWORD: string;

  // @IsNumber()
  // REDIS_DB: number;

  @IsString()
  FIREBASE_STORAGE_BUCKET: string;

  @IsString()
  CLOUDINARY_CLOUD_NAME: string;

  @IsString()
  CLOUDINARY_API_KEY: string;

  @IsString()
  CLOUDINARY_API_SECRET: string;

  @IsString()
  ERROR_WEBHOOK_URL: string;

  @IsString()
  AI_SERVICE_URL: string;

  @IsNumber()
  AI_SERVICE_TIMEOUT: number;

  @IsNumber()
  AI_SERVICE_MAX_RETRIES: number;

  @IsString()
  FRONTEND_URL: string;

  @IsString()
  MAIL_USER: string;

  @IsString()
  MAIL_PASSWORD: string;

  @IsString()
  MAIL_FROM: string;

  @IsString()
  MAIL_HOST: string;

  @IsString()
  ELASTICSEARCH_NODE: string;

  @IsOptional()
  @IsString()
  ELASTICSEARCH_USERNAME: string;

  @IsOptional()
  @IsString()
  ELASTICSEARCH_PASSWORD: string;

  @IsString()
  ELASTICSEARCH_INDEX_JOBS: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  SLOW_API_THRESHOLD_MS: number = 1000;

  @IsArray()
  @IsString({ each: true })
  CORS_ORIGINS: string[];
}

export default (): Record<string, any> => ({
  // Server
  NAME: process.env.NAME || "AI Recruit",
  PORT: parseInt(process.env.PORT || "3000", 10),
  NODE_ENV: process.env.NODE_ENV || "local",
  GLOBAL_PREFIX: process.env.GLOBAL_PREFIX || "/api/v1",

  // PostgreSQL
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_ADAPTER_URL: process.env.DATABASE_ADAPTER_URL,

  JWT_SECRET: process.env.JWT_SECRET,
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "1h",
  REFRESH_EXPIRES_IN: Number(process.env.REFRESH_EXPIRES_IN) || 7,

  // Redis
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PORT: process.env.REDIS_PORT,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  REDIS_DB: process.env.REDIS_DB,

  FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

  // Slack
  ERROR_WEBHOOK_URL: process.env.ERROR_WEBHOOK_URL,

  AI_SERVICE_URL: process.env.AI_SERVICE_URL,
  AI_SERVICE_TIMEOUT: Number(process.env.AI_SERVICE_TIMEOUT) || 120000,
  AI_SERVICE_MAX_RETRIES: Number(process.env.AI_SERVICE_MAX_RETRIES) || 3,
  AI_API_KEY: process.env.AI_API_KEY,
  FRONTEND_URL: process.env.FRONTEND_URL,

  MAIL_USER: process.env.MAIL_USER,
  MAIL_PASSWORD: process.env.MAIL_PASSWORD,
  MAIL_FROM: process.env.MAIL_FROM,
  MAIL_HOST: process.env.MAIL_HOST,

  // Elasticsearch
  ELASTICSEARCH_NODE: process.env.ELASTICSEARCH_NODE,
  ELASTICSEARCH_USERNAME: process.env.ELASTICSEARCH_USERNAME,
  ELASTICSEARCH_PASSWORD: process.env.ELASTICSEARCH_PASSWORD,
  ELASTICSEARCH_INDEX_JOBS: process.env.ELASTICSEARCH_INDEX_JOBS,

  // Performance
  SLOW_API_THRESHOLD_MS: parseInt(
    process.env.SLOW_API_THRESHOLD_MS || "1000",
    10,
  ),

  CORS_ORIGINS: (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim()),
});

export const validateConfig = (
  config: Record<string, unknown>,
): EnvironmentVariables => {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map((error) => Object.values(error.constraints || {}).join(", "))
      .join("; ");

    throw new Error(`Config validation error: ${errorMessages}`);
  }

  return validatedConfig;
};
