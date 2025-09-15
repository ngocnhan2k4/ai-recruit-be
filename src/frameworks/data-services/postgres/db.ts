import { drizzle } from "drizzle-orm/node-postgres";
import * as dotenv from "dotenv";
dotenv.config();

export const db = drizzle({
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: true,
  },
  casing: "snake_case",
});
