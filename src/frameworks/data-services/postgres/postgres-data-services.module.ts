import { Module } from "@nestjs/common";
import { IDataServices } from "../../../core";
import { PostgresDataServices } from "./postgres-data-services.service";
import { ConfigService } from "@nestjs/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

@Module({
  providers: [
    {
      provide: "DRIZZLE",
      useFactory: async (configService: ConfigService) => {
        try {
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
          await pool.query("SELECT 1");
          console.log("Database connection established successfully.");
          const db = drizzle(pool, { casing: "snake_case" });
          return db;
        } catch (err) {
          console.error("Error setting up Drizzle ORM:", err);
          throw err;
        }
      },
      inject: [ConfigService],
    },
    {
      provide: IDataServices,
      useClass: PostgresDataServices,
    },
  ],
  exports: [IDataServices],
})
export class PostgresDataServicesModule {}
