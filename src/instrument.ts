// instrument.ts is imported before NestJS ConfigModule loads,
// so we must load .env manually here to get env vars (e.g. SENTRY_DSN).
import dotenv from "dotenv";
import * as Sentry from "@sentry/nestjs";
import { Environment } from "./common/config";

dotenv.config();

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = Environment.Local;
}

const nodeEnv = process.env.NODE_ENV;
const isLocal = nodeEnv === Environment.Local.toString();

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: nodeEnv,
  enabled: !isLocal && !!process.env.SENTRY_DSN,
  sendDefaultPii: true,
  tracesSampleRate: nodeEnv === Environment.Production.toString() ? 0.1 : 1.0,
});
