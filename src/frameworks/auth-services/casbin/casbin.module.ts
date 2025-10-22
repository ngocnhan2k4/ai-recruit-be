import { Module } from "@nestjs/common";
import { newSyncedEnforcer } from "casbin";
import path from "path";
import { ConfigService } from "@nestjs/config";
import { CasbinService } from "./casbin.service";
import { DrizzleCasbinAdapter } from "./casbin.adapter";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

@Module({
  providers: [
    {
      provide: "CASBIN_ENFORCER",
      useFactory: async (configService: ConfigService) => {
        const modelPath = path.resolve(
          process.cwd(),
          "src/common/config/rbac_model.conf",
        );

        const databaseAdapterUrl = configService.get<string>(
          "DATABASE_ADAPTER_URL",
        );

        const pool = new Pool({
          connectionString: databaseAdapterUrl,
          ssl:
            process.env.NODE_ENV === "production"
              ? { rejectUnauthorized: false }
              : false,
          max: 10,
          min: 2,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        });

        const db = drizzle(pool, {
          casing: "snake_case",
        });

        const adapter = new DrizzleCasbinAdapter(db);

        // Create enforcer with the adapter
        const enforcer = await newSyncedEnforcer(modelPath, adapter);

        await enforcer.loadPolicy();
        return enforcer;
      },
      inject: [ConfigService],
    },
    CasbinService,
  ],
  exports: ["CASBIN_ENFORCER", CasbinService],
})
export class CasbinModule {}
