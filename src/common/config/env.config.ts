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
  NAME: string = "CareerLens";

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

  @IsOptional()
  @IsString()
  TIMEZONE: string = "Asia/Ho_Chi_Minh";

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

  @IsString()
  REDIS_HOST: string;

  @IsNumber()
  REDIS_PORT: number;

  @IsString()
  REDIS_PASSWORD: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  REDIS_DB: number = 0;

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

  @IsOptional()
  @IsString()
  AI_API_KEY: string;

  @IsOptional()
  @IsString()
  AI_BLOG_AUTHOR_ID: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  AI_BLOG_RANGE_DAYS: number = 7;

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

  @IsString()
  ELASTICSEARCH_INDEX_CVS: string;

  @IsOptional()
  @IsString()
  ELASTICSEARCH_INDEX_EVENT_TRACKING: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  SLOW_API_THRESHOLD_MS: number = 1000;

  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }: { value: string }) =>
    Array.isArray(value) ? value : value.split(",").map((o) => o.trim()),
  )
  CORS_ORIGINS: string[];

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      return !["false", "0", "off", "no"].includes(value.toLowerCase());
    }
    return true;
  })
  RATE_LIMIT_ENABLED: boolean = true;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  RATE_LIMIT_CAPACITY: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }: { value: string }) => parseFloat(value))
  RATE_LIMIT_REFILL_RATE: number;

  @IsOptional()
  @IsString()
  SWAGGER_USERNAME: string;

  @IsOptional()
  @IsString()
  SWAGGER_PASSWORD: string;

  @IsOptional()
  @IsString()
  SLACK_ERROR_WEBHOOK_URL: string;

  @IsOptional()
  @IsString()
  SENTRY_DSN: string;

  // Deployment via SSH
  @IsOptional()
  @IsString()
  DEPLOY_SSH_HOST: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  DEPLOY_SSH_PORT: number = 22;

  @IsOptional()
  @IsString()
  DEPLOY_SSH_USER: string;

  @IsOptional()
  @IsString()
  DEPLOY_SSH_PASSWORD: string;

  @IsOptional()
  @IsString()
  DEPLOY_WORKDIR: string;

  @IsOptional()
  @IsString()
  DEPLOY_COMPOSE_FILE: string;

  @IsOptional()
  @IsString()
  DEPLOY_SERVICE_NAME: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }: { value: string }) => parseFloat(value))
  TIME_TO_DELETE_ACCOUNT_DAYS: number = 30;

  @IsOptional()
  @IsString()
  GOOGLE_TRANSLATE_API_KEY: string;

  @IsOptional()
  @IsString()
  GOOGLE_TRANSLATE_BASE_URL: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  GOOGLE_TRANSLATE_TIMEOUT: number = 10000;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  GOOGLE_TRANSLATE_MAX_RETRIES: number = 2;
}

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
