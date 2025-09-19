import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  migrations:{
    prefix: "timestamp",
  },
  schema: "./src/frameworks/data-services/postgres/schema.ts",
  out: "./drizzle/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
});
