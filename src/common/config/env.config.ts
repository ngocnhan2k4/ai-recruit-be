import { Transform, plainToClass } from "class-transformer";
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  validateSync,
} from "class-validator";

enum Environment {
  Development = "development",
  Production = "production",
  Test = "test",
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
  NODE_ENV: Environment = Environment.Development;

  @IsOptional()
  @IsString()
  GLOBAL_PREFIX: string = "/api/v1";

  @IsString()
  DATABASE_URL: string;
}

export default (): Record<string, any> => ({
  // Server
  NAME: process.env.NAME || "AI Recruit",
  PORT: parseInt(process.env.PORT || "3000", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
  GLOBAL_PREFIX: process.env.GLOBAL_PREFIX || "/api/v1",

  // PostgreSQL
  DATABASE_URL: process.env.DATABASE_URL,
});

export const validateConfig = (
  config: Record<string, unknown>,
): EnvironmentVariables => {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map((error) => Object.values(error.constraints || {}).join(", "))
      .join("; ");

    throw new Error(`Config validation error: ${errorMessages}`);
  }

  return validatedConfig as EnvironmentVariables;
};
