// instrument.ts is imported before NestJS ConfigModule loads,
// so we must load .env manually here to get env vars (e.g. SENTRY_DSN).
import * as Sentry from "@sentry/nestjs";
import { Environment } from "./common/config";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || Environment.Local,
  enabled: !!process.env.SENTRY_DSN,
  sendDefaultPii: true,
  // Capture 100% of transactions in development/local, 10% in production
  tracesSampleRate: process.env.NODE_ENV === Environment.Production ? 0.1 : 1.0,
});
