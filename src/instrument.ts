// instrument.ts is imported before NestJS ConfigModule loads,
// so we must load .env manually here to get env vars (e.g. SENTRY_DSN).
import * as dotenv from "dotenv";
dotenv.config();

import * as Sentry from "@sentry/nestjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "local",
  // Enable whenever DSN is set (works with NODE_ENV=local for testing)
  enabled: !!process.env.SENTRY_DSN,
  sendDefaultPii: true,
  // Capture 100% of transactions in development/local, 10% in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
});
