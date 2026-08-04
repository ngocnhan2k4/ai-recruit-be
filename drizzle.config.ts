import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/frameworks/data-services/postgres/schema.ts",
  out: "./drizzle/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL || process.env.DRIZZLE_DATABASE_URL || "",
  },
  verbose: true,
});
