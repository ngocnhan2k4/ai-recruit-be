import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { Logger } from "@nestjs/common";
import { DBDrizzle } from "@/frameworks/data-services/postgres/types";
import {
  IAuthRepository,
  ICategoryRepository,
  IJobRepository,
  IProvinceRepository,
  IUserExperienceRepository,
  IUserRepository,
  IUserSkillRepository,
} from "@/core";
import { AuthPostgresRepository } from "./repositories/auth-postgres.repository";
import { CategoryPostgresRepository } from "./repositories/category-postgres.repository";
import { JobPostgresRepository } from "./repositories/job-postgres.repository";
import { ProvincePostgresRepository } from "./repositories/province-postgres.repository";
import { UserExperiencePostgresRepository } from "./repositories/user-experience-postgres.repository";
import { UserSkillPostgresRepository } from "./repositories/user-skill-postgres.repository";
import { UserPostgresRepository } from "./repositories/user-postgres.repository";

@Global()
@Module({
  providers: [
    {
      provide: "DRIZZLE",
      useFactory: async (configService: ConfigService): Promise<DBDrizzle> => {
        const logger = new Logger("PostgresDataServicesModule");
        try {
          const pool = new Pool({
            connectionString: configService.get<string>("DATABASE_URL"),
            ssl:
              process.env.NODE_ENV === "production"
                ? { rejectUnauthorized: false }
                : false,
            max: 20, // Maximum number of connections in the pool
            min: 5, // Minimum number of connections in the pool
            idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
            connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection could not be established
          });
          const maxRetries = 3;
          let attempt = 0;
          let connected = false;

          while (!connected && attempt < maxRetries) {
            attempt++;
            try {
              await pool.query("SELECT 1");
              connected = true;
              logger.log(
                `Database connection established successfully (attempt ${attempt}).`,
              );
            } catch (err) {
              logger.error(
                `Database connection attempt ${attempt} failed:`,
                err,
              );
              if (attempt < maxRetries) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
              } else {
                throw err; // hết retry thì throw
              }
            }
          }
          const db = drizzle(pool, {
            casing: "snake_case",
            // logger: process.env.NODE_ENV === "development",
          }) as DBDrizzle;
          return db;
        } catch (err) {
          logger.error("Error setting up Drizzle ORM:", err);
          throw err;
        }
      },
      inject: [ConfigService],
    },
    {
      provide: IAuthRepository,
      useClass: AuthPostgresRepository,
    },
    {
      provide: ICategoryRepository,
      useClass: CategoryPostgresRepository,
    },
    {
      provide: IJobRepository,
      useClass: JobPostgresRepository,
    },
    {
      provide: IProvinceRepository,
      useClass: ProvincePostgresRepository,
    },
    {
      provide: IUserExperienceRepository,
      useClass: UserExperiencePostgresRepository,
    },
    {
      provide: IUserSkillRepository,
      useClass: UserSkillPostgresRepository,
    },
    {
      provide: IUserRepository,
      useClass: UserPostgresRepository,
    },
  ],
  exports: [
    IAuthRepository,
    ICategoryRepository,
    IJobRepository,
    IProvinceRepository,
    IUserExperienceRepository,
    IUserSkillRepository,
    IUserRepository,
  ],
})
export class PostgresDataServicesModule {}
