import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as dotenv from "dotenv";
dotenv.config();

// Tạo connection pool - kết nối 1 lần khi start app
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
  max: 20, // Maximum number of connections in the pool
  min: 5, // Minimum number of connections in the pool
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection could not be established
});

export const db = drizzle(pool, {
  casing: "snake_case",
});

// Log connection status
pool.on("connect", () => {
  console.log("📊 Database connected successfully");
});

pool.on("error", (err) => {
  console.error("❌ Database connection error:", err);
});

// Force an initial connection at app startup so logs appear immediately
export const ensureDatabaseConnection = async (): Promise<void> => {
  await pool.query("SELECT 1");
};
